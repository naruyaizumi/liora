import { SQL } from "bun";
import { serialize, deserialize, makeKey } from "./binary.js";

export { makeKey };

export class DatabaseCore {
  constructor() {
    this.instanceId = `DatabaseCore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const connectionString = Bun.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/liora";
    this.db = new SQL(connectionString, {
      max: 50,
      idleTimeout: 60000,
      connectionTimeout: 10000,
      maxLifetime: 300000
    });
    this.initialized = false;
    this.initPromise = this._initDatabase();
    this.disposed = false;
  }

  async _initDatabase() {
    await this.db`
      CREATE TABLE IF NOT EXISTS baileys_state (
        key TEXT PRIMARY KEY,
        value BYTEA NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await this.db`
      CREATE INDEX IF NOT EXISTS idx_baileys_key_btree 
      ON baileys_state USING btree (key)
    `;
    this.initialized = true;
  }

  async _ensureInitialized() {
    if (!this.initialized && this.initPromise) await this.initPromise;
    return this.initialized;
  }

  async get(key) {
    if (this.disposed) return undefined;
    await this._ensureInitialized();
    const result = await this.db`
      SELECT value FROM baileys_state WHERE key = ${key}
    `;
    if (result.length === 0) return undefined;
    const bytes = result[0].value;
    return { value: deserialize(bytes) };
  }

  async getMany(keys) {
    if (this.disposed || keys.length === 0) return {};
    await this._ensureInitialized();
    const result = await this.db`
      SELECT key, value FROM baileys_state 
      WHERE key IN ${this.db(keys)}
    `;
    const out = {};
    for (const row of result) {
      out[row.key] = { value: deserialize(row.value) };
    }
    return out;
  }

  async set(key, value) {
    if (this.disposed) return;
    await this._ensureInitialized();
    const bytes = serialize(value);
    if (bytes === null) {
      await this.del(key);
      return;
    }
    await this.db`
      INSERT INTO baileys_state (key, value) 
      VALUES (${key}, ${bytes}) 
      ON CONFLICT (key) 
      DO UPDATE SET value = EXCLUDED.value
    `;
  }

  async del(key) {
    if (this.disposed) return;
    await this._ensureInitialized();
    await this.db`DELETE FROM baileys_state WHERE key = ${key}`;
  }

  async setMany(data) {
    if (this.disposed) return;
    await this._ensureInitialized();
    const entries = Object.entries(data);
    if (entries.length === 0) return;
    
    const toInsert = [];
    const toDelete = [];
    
    for (const [key, value] of entries) {
      const bytes = serialize(value);
      if (bytes === null) {
        toDelete.push(key);
      } else {
        toInsert.push({ key, bytes });
      }
    }
    
    if (toDelete.length > 0) {
      await this.db`DELETE FROM baileys_state WHERE key IN ${this.db(toDelete)}`;
    }
    
    if (toInsert.length > 0) {
      const keys = toInsert.map(item => item.key);
      const values = toInsert.map(item => item.bytes);
      await this.db`
        INSERT INTO baileys_state (key, value)
        SELECT unnest(${keys}::text[]), unnest(${values}::bytea[])
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
    }
  }

  async deleteMany(keys) {
    if (this.disposed || keys.length === 0) return;
    await this._ensureInitialized();
    await this.db`DELETE FROM baileys_state WHERE key IN ${this.db(keys)}`;
  }

  async flush() {
    return Promise.resolve();
  }

  async dispose() {
    if (this.disposed) return;
    try {
      await this.db`VACUUM ANALYZE baileys_state`;
    } finally {
      try {
        await this.db.close();
      } catch {}
      this.disposed = true;
      this.db = null;
      this.initialized = false;
    }
  }

  isHealthy() {
    return !this.disposed && this.db !== null && this.initialized;
  }
}

const core = new DatabaseCore();
export default core;