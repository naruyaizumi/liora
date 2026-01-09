import { Database } from "bun:sqlite";
import { encode, decode } from "@msgpack/msgpack";

const EVENT_PRIORITY = {
  CORE: 0,
  AUX: 1,
  NOISE: 2,
};

const TTL_STRATEGY = {
  message: 604800,
  chat: 604800,
  contact: 2592000,
  group: 604800,
  presence: 300,
  typing: 60,
  receipt: 86400,
  call: 259200,
  blocklist: 2592000,
  processed: 900,
};

const MAX_QUEUE_SIZE = 500;
const MAX_INFLIGHT_OPS = 100;
const CLEANUP_INTERVAL = 3600000;

export class MemoryStore {
  constructor() {
    this.db = new Database(":memory:", { strict: true });
    this._initDatabase();
    this._prepareStatements();
    
    this.eventQueue = [];
    this.inflightOps = 0;
    this.droppedEvents = 0;
    this.processing = false;
    
    this._startEventProcessor();
    this._startAutoCleanup();
  }

  _initDatabase() {
    this.db.exec("PRAGMA journal_mode = MEMORY");
    this.db.exec("PRAGMA synchronous = OFF");
    this.db.exec("PRAGMA temp_store = MEMORY");
    this.db.exec("PRAGMA locking_mode = EXCLUSIVE");
    this.db.exec("PRAGMA page_size = 8192");
    this.db.exec("PRAGMA cache_size = -16384");
    
    this.db.exec(`
      CREATE TABLE kv (
        k TEXT PRIMARY KEY NOT NULL,
        v BLOB NOT NULL,
        t TEXT NOT NULL,
        e INTEGER NOT NULL,
        p INTEGER NOT NULL DEFAULT 0,
        c INTEGER NOT NULL DEFAULT 0
      ) WITHOUT ROWID;
    `);
    
    this.db.exec("CREATE INDEX idx_expire ON kv(e) WHERE e > 0;");
    this.db.exec("CREATE INDEX idx_type ON kv(t);");
  }

  _prepareStatements() {
    this.stmtGet = this.db.query("SELECT v FROM kv WHERE k = ? AND (e = 0 OR e > unixepoch())");
    this.stmtSet = this.db.query("INSERT OR REPLACE INTO kv (k, v, t, e, p, c) VALUES (?, ?, ?, ?, ?, unixepoch())");
    this.stmtDel = this.db.query("DELETE FROM kv WHERE k = ?");
    this.stmtExists = this.db.query("SELECT 1 FROM kv WHERE k = ? AND (e = 0 OR e > unixepoch())");
    this.stmtKeys = this.db.query("SELECT k FROM kv WHERE k LIKE ? AND (e = 0 OR e > unixepoch())");
    this.stmtCleanup = this.db.query("DELETE FROM kv WHERE e > 0 AND e <= unixepoch()");
    this.stmtTouch = this.db.query("UPDATE kv SET p = p + 1 WHERE k = ?");
    this.stmtEvict = this.db.query(`
      DELETE FROM kv WHERE k IN (
        SELECT k FROM kv WHERE e = 0 ORDER BY p ASC, c ASC LIMIT ?
      )
    `);
    
    this.stmtBatchGet = this.db.prepare(`
      SELECT k, v FROM kv 
      WHERE k IN (SELECT value FROM json_each(?)) 
      AND (e = 0 OR e > unixepoch())
    `);
    
    this.stmtBatchSet = this.db.prepare(`
      INSERT OR REPLACE INTO kv (k, v, t, e, p, c) 
      VALUES (?, ?, ?, ?, ?, unixepoch())
    `);
  }

  _startEventProcessor() {
    const process = () => {
      if (this.processing || this.eventQueue.length === 0) {
        setImmediate(process);
        return;
      }

      this.processing = true;

      while (this.eventQueue.length > 0 && this.inflightOps < MAX_INFLIGHT_OPS) {
        const event = this.eventQueue.shift();
        if (!event) break;

        this.inflightOps++;
        this._processEvent(event).finally(() => {
          this.inflightOps--;
        });
      }

      this.processing = false;
      setImmediate(process);
    };

    setImmediate(process);
  }

  async _processEvent(event) {
    const { type, data } = event;
    
    try {
      await this._executeEvent(type, data);
    } catch (e) {
      global.logger?.error({ error: e.message, type }, "Event processing error");
    }
  }

  async _executeEvent(type, data) {
    //
  }

  _startAutoCleanup() {
    const cleanup = () => {
      try {
        const deleted = this.stmtCleanup.run();
        
        if (deleted.changes > 0) {
          global.logger?.debug({ deleted: deleted.changes }, "Expired entries cleaned");
        }

        const count = this.db.query("SELECT COUNT(*) as c FROM kv WHERE e = 0").get();
        const maxNonExpiring = 10000;
        
        if (count.c > maxNonExpiring) {
          const toEvict = count.c - maxNonExpiring;
          this.stmtEvict.run(toEvict);
          global.logger?.debug({ evicted: toEvict }, "LFU eviction performed");
        }
      } catch (e) {
        global.logger?.error({ error: e.message }, "Cleanup error");
      }
    };

    setInterval(cleanup, CLEANUP_INTERVAL);
    setTimeout(cleanup, 60000);
  }

  enqueueEvent(type, data, priority = EVENT_PRIORITY.CORE) {
    if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
      if (priority === EVENT_PRIORITY.NOISE) {
        this.droppedEvents++;
        return;
      }
      this.eventQueue.shift();
    }

    this.eventQueue.push({ type, data, priority });
  }

  _getTTL(type) {
    return TTL_STRATEGY[type] || TTL_STRATEGY.chat;
  }

  atomicSet(key, value, type = "chat") {
    const ttl = this._getTTL(type);
    const expireAt = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : 0;
    
    try {
      const serialized = encode(value);
      this.stmtSet.run(key, serialized, type, expireAt, 0);
    } catch (e) {
      global.logger?.error({ 
        error: e.message, 
        key,
        valueType: typeof value,
        valueKeys: value && typeof value === 'object' ? Object.keys(value) : 'N/A'
      }, "Atomic set error");
    }
  }

  set(key, value, type = "chat") {
    return this.atomicSet(key, value, type);
  }

  get(key) {
    try {
      const row = this.stmtGet.get(key);
      if (!row) return null;
      
      setImmediate(() => {
        try {
          this.stmtTouch.run(key);
        } catch {}
      });
      
      return decode(row.v);
    } catch (e) {
      global.logger?.error({ error: e.message, key }, "Get error");
      return null;
    }
  }

  del(key) {
    try {
      this.stmtDel.run(key);
    } catch (e) {
      global.logger?.error({ error: e.message, key }, "Del error");
    }
  }

  exists(key) {
    try {
      return !!this.stmtExists.get(key);
    } catch {
      return false;
    }
  }

  keys(pattern) {
    try {
      const sqlPattern = pattern.replace(/\*/g, "%");
      const rows = this.stmtKeys.all(sqlPattern);
      return rows.map(r => r.k);
    } catch {
      return [];
    }
  }

  mget(keys) {
    if (keys.length === 0) return [];
    
    try {
      const stmt = this.db.query(`
        SELECT k, v FROM kv 
        WHERE k IN (${keys.map(() => '?').join(',')}) 
        AND (e = 0 OR e > unixepoch())
      `);
      
      const rows = stmt.all(...keys);
      const map = new Map(rows.map(r => [r.k, decode(r.v)]));
      
      return keys.map(k => map.get(k) || null);
    } catch {
      return keys.map(() => null);
    }
  }

  setMany(items, type = "chat") {
    if (items.length === 0) return;
    
    const ttl = this._getTTL(type);
    const expireAt = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : 0;
    
    try {
      const transaction = this.db.transaction((items) => {
        for (const [key, value] of items) {
          const serialized = encode(value);
          this.stmtBatchSet.run(key, serialized, type, expireAt, 0);
        }
      });
      
      transaction(items);
    } catch (e) {
      global.logger?.error({ error: e.message }, "SetMany error");
    }
  }

  bulkGet(keys) {
    if (keys.length === 0) return new Map();
    
    try {
      const keysJson = JSON.stringify(keys);
      const rows = this.stmtBatchGet.all(keysJson);
      
      const result = new Map();
      for (const row of rows) {
        try {
          result.set(row.k, decode(row.v));
        } catch (e) {
          global.logger?.debug({ key: row.k, error: e.message }, "Failed to decode value");
        }
      }
      
      return result;
    } catch (e) {
      global.logger?.error({ error: e.message }, "BulkGet error");
      return new Map();
    }
  }

  scan(pattern, limit = 100) {
    try {
      const sqlPattern = pattern.replace(/\*/g, "%");
      const rows = this.db.query(`
        SELECT k, v FROM kv 
        WHERE k LIKE ? AND (e = 0 OR e > unixepoch())
        LIMIT ?
      `).all(sqlPattern, limit);
      
      return rows.map(row => ({
        key: row.k,
        value: decode(row.v)
      }));
    } catch (e) {
      global.logger?.error({ error: e.message, pattern }, "Scan error");
      return [];
    }
  }

  increment(key, amount = 1, type = "processed") {
    const current = this.get(key) || 0;
    const newValue = typeof current === 'number' ? current + amount : amount;
    this.set(key, newValue, type);
    return newValue;
  }

  getStats() {
    try {
      const stats = this.db.query(`
        SELECT 
          t as type,
          COUNT(*) as count,
          SUM(LENGTH(v)) as total_size
        FROM kv 
        WHERE e = 0 OR e > unixepoch()
        GROUP BY t
      `).all();
      
      const total = this.db.query("SELECT COUNT(*) as total FROM kv WHERE e = 0 OR e > unixepoch()").get();
      
      return {
        healthy: true,
        totalEntries: total.total,
        queueSize: this.eventQueue.length,
        inflightOps: this.inflightOps,
        droppedEvents: this.droppedEvents,
        types: stats
      };
    } catch (e) {
      return {
        healthy: false,
        error: e.message
      };
    }
  }

  disconnect() {
    try {
      this.stmtGet?.finalize();
      this.stmtSet?.finalize();
      this.stmtDel?.finalize();
      this.stmtExists?.finalize();
      this.stmtKeys?.finalize();
      this.stmtCleanup?.finalize();
      this.stmtTouch?.finalize();
      this.stmtEvict?.finalize();
      this.stmtBatchGet?.finalize();
      this.stmtBatchSet?.finalize();
      
      this.db.close();
      
      this.eventQueue = [];
      this.inflightOps = 0;
      this.processing = false;
      
      global.logger?.info("MemoryStore disconnected");
    } catch (e) {
      global.logger?.error({ error: e.message }, "Disconnect error");
    }
  }

  isHealthy() {
    try {
      this.db.query("SELECT 1").get();
      return true;
    } catch {
      return false;
    }
  }

  getMetrics() {
    try {
      const stats = this.db.query("SELECT COUNT(*) as total FROM kv WHERE e = 0 OR e > unixepoch()").get();
      const memory = this.db.query("SELECT SUM(LENGTH(v)) as size FROM kv").get();
      
      return {
        healthy: this.isHealthy(),
        inflightOps: this.inflightOps,
        queueSize: this.eventQueue.length,
        droppedEvents: this.droppedEvents,
        totalEntries: stats.total,
        totalSize: memory.size || 0,
        processing: this.processing
      };
    } catch {
      return {
        healthy: false,
        inflightOps: this.inflightOps,
        queueSize: this.eventQueue.length,
        droppedEvents: this.droppedEvents
      };
    }
  }
}

export { EVENT_PRIORITY };