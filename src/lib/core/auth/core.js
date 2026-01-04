import { SQL } from "bun";
import { BufferJSON } from "baileys";

const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);

export const parse = (str) => {
  if (!str) return null;
  try {
    return JSON.parse(str, BufferJSON.reviver);
  } catch (e) {
    global.logger?.error(e.message);
    return null;
  }
};

export const makeKey = (type, id) => `${type}-${id}`;

export class DatabaseCore {
  constructor(options = {}) {
    this.instanceId = `DatabaseCore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const connectionString =
      Bun.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/liora";

    this.db = new SQL(connectionString, {
      max: 30,
      idleTimeout: 30000,
      connectionTimeout: 3000,
    });

    this.initialized = false;
    this.initPromise = this._initDatabase().catch((err) => {
      global.logger?.error(
        { error: err.message },
        "Database initialization failed",
      );
      throw err;
    });

    this.disposed = false;
    this.writeQueue = new Map();
  }

  async _initDatabase() {
    try {
      await this.db`
        CREATE TABLE IF NOT EXISTS baileys_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      await this.db`
        CREATE INDEX IF NOT EXISTS idx_baileys_key_hash 
        ON baileys_state USING hash(key)
      `;

      try {
        await this.db`
          CREATE OR REPLACE FUNCTION update_baileys_timestamp()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `;

        await this
          .db`DROP TRIGGER IF EXISTS baileys_updated_at ON baileys_state`;
        await this.db`
          CREATE TRIGGER baileys_updated_at
          BEFORE UPDATE ON baileys_state
          FOR EACH ROW
          EXECUTE FUNCTION update_baileys_timestamp()
        `;
      } catch {
        //
      }

      this.initialized = true;
    } catch (e) {
      global.logger?.fatal(
        { error: e.message, stack: e.stack },
        "Database initialization failed",
      );
      throw e;
    }
  }

  async _ensureInitialized() {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
    return this.initialized;
  }

  async get(key) {
    if (this.disposed) return undefined;
    await this._ensureInitialized();

    try {
      const result = await this.db`
        SELECT value FROM baileys_state WHERE key = ${key}
      `;
      return result.length > 0 ? result[0] : undefined;
    } catch (e) {
      global.logger?.error(`Get error for key ${key}: ${e.message}`);
      return undefined;
    }
  }

  async getMany(keys) {
    if (this.disposed || keys.length === 0) return {};
    await this._ensureInitialized();

    try {
      const promises = keys.map((key) => this.get(key));
      const results = await Promise.all(promises);

      const out = {};
      for (let i = 0; i < keys.length; i++) {
        if (results[i]) {
          out[keys[i]] = results[i];
        }
      }
      return out;
    } catch (e) {
      global.logger?.error(`GetMany error: ${e.message}`);
      return {};
    }
  }

  async set(key, value) {
    if (this.disposed) return;
    await this._ensureInitialized();

    if (this.writeQueue.has(key)) {
      await this.writeQueue.get(key);
    }

    const writePromise = (async () => {
      try {
        await this.db`
          INSERT INTO baileys_state (key, value) 
          VALUES (${key}, ${stringify(value)}) 
          ON CONFLICT (key) 
          DO UPDATE SET value = EXCLUDED.value
        `;
      } catch (e) {
        global.logger?.error(`Set error for key ${key}: ${e.message}`);
        throw e;
      } finally {
        this.writeQueue.delete(key);
      }
    })();

    this.writeQueue.set(key, writePromise);

    return writePromise;
  }

  async del(key) {
    if (this.disposed) return;
    await this._ensureInitialized();

    try {
      await this.db`DELETE FROM baileys_state WHERE key = ${key}`;
    } catch (e) {
      global.logger?.error(`Delete error for key ${key}: ${e.message}`);
      throw e;
    }
  }

  async setMany(data) {
    if (this.disposed) return;
    await this._ensureInitialized();

    const entries = Object.entries(data);
    if (entries.length === 0) return;

    try {
      const pendingKeys = new Set();
      const canExecuteNow = [];

      for (const [key, value] of entries) {
        if (this.writeQueue.has(key)) {
          pendingKeys.add(key);
        } else {
          canExecuteNow.push([key, value]);
        }
      }

      if (pendingKeys.size > 0) {
        const waitPromises = Array.from(pendingKeys).map((k) =>
          this.writeQueue.get(k),
        );
        await Promise.all(waitPromises);
      }

      const promises = entries.map(([key, value]) => {
        const writePromise = this.db`
          INSERT INTO baileys_state (key, value) 
          VALUES (${key}, ${stringify(value)}) 
          ON CONFLICT (key) 
          DO UPDATE SET value = EXCLUDED.value
        `.finally(() => {
          this.writeQueue.delete(key);
        });

        this.writeQueue.set(key, writePromise);
        return writePromise;
      });

      await Promise.all(promises);
    } catch (error) {
      global.logger?.error(`Batch set error: ${error.message}`);
      throw error;
    }
  }

  async deleteMany(keys) {
    if (this.disposed || keys.length === 0) return;
    await this._ensureInitialized();

    try {
      const promises = keys.map(
        (key) => this.db`DELETE FROM baileys_state WHERE key = ${key}`,
      );

      await Promise.all(promises);
    } catch (error) {
      global.logger?.error(`Batch delete error: ${error.message}`);
      throw error;
    }
  }

  async flush() {
    return Promise.resolve();
  }

  async dispose() {
    if (this.disposed) return;

    try {
      await this.db`VACUUM ANALYZE baileys_state`;
    } catch (e) {
      global.logger?.error(`Dispose cleanup error: ${e.message}`);
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
