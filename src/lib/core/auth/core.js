import { SQL } from "bun";
import { serialize, deserialize } from "./binary.js";

export class DatabaseCore {
  constructor(options = {}) {
    this.instanceId = `IZUMI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      global.logger?.error({ error: err.message }, "Database initialization failed");
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
          value BYTEA NOT NULL,
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

        await this.db`DROP TRIGGER IF EXISTS baileys_updated_at ON baileys_state`;
        await this.db`
          CREATE TRIGGER baileys_updated_at
          BEFORE UPDATE ON baileys_state
          FOR EACH ROW
          EXECUTE FUNCTION update_baileys_timestamp()
        `;
      } catch {}

      this.initialized = true;
    } catch (e) {
      global.logger?.fatal({ error: e.message, stack: e.stack }, "Database initialization failed");
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
      
      if (result.length === 0) return undefined;
      
      const bytes = result[0].value;
      if (!(bytes instanceof Uint8Array)) {
        return { value: deserialize(new Uint8Array(bytes)) };
      }
      return { value: deserialize(bytes) };
    } catch (e) {
      global.logger?.error(`Get error for key ${key}: ${e.message}`);
      return undefined;
    }
  }

  async getMany(keys) {
    if (this.disposed || keys.length === 0) return {};
    await this._ensureInitialized();

    try {
      const result = await this.db`
        SELECT key, value 
        FROM baileys_state 
        WHERE key = ANY(${keys})
      `;

      const out = {};
      for (const row of result) {
        const bytes = row.value;
        const value = deserialize(
          bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
        );
        out[row.key] = { value };
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

      for (const [key] of entries) {
        if (this.writeQueue.has(key)) {
          pendingKeys.add(key);
        }
      }

      if (pendingKeys.size > 0) {
        await Promise.all(Array.from(pendingKeys, k => this.writeQueue.get(k)));
      }

      const validEntries = [];
      const deleteKeys = [];

      for (const [key, value] of entries) {
        const bytes = serialize(value);
        if (bytes === null) {
          deleteKeys.push(key);
        } else {
          validEntries.push({ key, bytes });
        }
      }

      const promises = [];

      if (validEntries.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < validEntries.length; i += batchSize) {
          const batch = validEntries.slice(i, i + batchSize);
          
          const writePromise = (async () => {
            try {
              const values = batch.map(({ key, bytes }) => [key, bytes]);
              
              await this.db`
                INSERT INTO baileys_state (key, value)
                SELECT * FROM UNNEST(
                  ${values.map(v => v[0])}::text[],
                  ${values.map(v => v[1])}::bytea[]
                )
                ON CONFLICT (key) 
                DO UPDATE SET value = EXCLUDED.value
              `;
            } finally {
              for (const { key } of batch) {
                this.writeQueue.delete(key);
              }
            }
          })();

          for (const { key } of batch) {
            this.writeQueue.set(key, writePromise);
          }
          
          promises.push(writePromise);
        }
      }

      if (deleteKeys.length > 0) {
        promises.push(this.deleteMany(deleteKeys));
      }

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
      await this.db`
        DELETE FROM baileys_state 
        WHERE key = ANY(${keys})
      `;
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