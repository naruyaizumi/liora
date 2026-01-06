import { SQL } from "bun";

export const makeKey = (type, id) => `${type}:${id}`;

export class DatabaseCore {
  constructor() {
    this.instanceId = `db-${Date.now()}`;

    const url =
      Bun.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/liora";

    this.db = new SQL(url, {
      max: 80,
      idleTimeout: 10000,
      connectionTimeout: 2000,
    });

    this.initialized = false;
    this.disposed = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.db`
        CREATE TABLE IF NOT EXISTS baileys_keys (
          k TEXT PRIMARY KEY,
          v BYTEA NOT NULL
        )
      `;

      await this.db`
        CREATE INDEX IF NOT EXISTS idx_baileys_keys_hash 
        ON baileys_keys USING hash(k)
      `;

      this.initialized = true;
      global.logger?.info("PostgresSQL initialized");
    } catch (e) {
      global.logger?.fatal({ error: e.message }, "DB init failed");
      throw e;
    }
  }

  async get(key) {
    if (this.disposed) return null;
    if (!this.initialized) await this.init();

    try {
      const rows = await this.db`
        SELECT v FROM baileys_keys WHERE k = ${key}
      `;
      if (rows.length === 0) return null;

      const buf = rows[0].v;
      return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    } catch (e) {
      global.logger?.error(`Get error: ${key} - ${e.message}`);
      return null;
    }
  }

  async getMany(keys) {
    if (this.disposed || keys.length === 0) return {};
    if (!this.initialized) await this.init();

    const result = {};

    if (keys.length === 1) {
      try {
        const rows = await this.db`
          SELECT k, v FROM baileys_keys WHERE k = ${keys[0]}
        `;
        if (rows.length > 0) {
          const buf = rows[0].v;
          result[rows[0].k] =
            buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        }
      } catch (e) {
        global.logger?.error(`GetMany single error: ${e.message}`);
      }
      return result;
    }

    const batchSize = 50;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      try {
        const rows = await this.db`
          SELECT k, v FROM baileys_keys WHERE k IN (${batch})
        `;

        for (const row of rows) {
          const buf = row.v;
          result[row.k] = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        }
      } catch (e) {
        global.logger?.error(`GetMany batch error: ${e.message}`);
      }
    }

    return result;
  }

  async set(key, value) {
    if (this.disposed) return;
    if (!this.initialized) await this.init();

    try {
      if (!value) {
        await this.del(key);
        return;
      }

      const buf = value instanceof Uint8Array ? value : new Uint8Array(value);
      await this.db`
        INSERT INTO baileys_keys (k, v) 
        VALUES (${key}, ${buf})
        ON CONFLICT (k) 
        DO UPDATE SET v = EXCLUDED.v
      `;
    } catch (e) {
      global.logger?.error(`Set error: ${key} - ${e.message}`);
      throw e;
    }
  }

  async del(key) {
    if (this.disposed) return;
    if (!this.initialized) await this.init();

    try {
      await this.db`
        DELETE FROM baileys_keys WHERE k = ${key}
      `;
    } catch (e) {
      global.logger?.error(`Del error: ${key} - ${e.message}`);
    }
  }

  async setMany(data) {
    if (this.disposed || Object.keys(data).length === 0) return;
    if (!this.initialized) await this.init();

    for (const [key, value] of Object.entries(data)) {
      try {
        if (!value) {
          await this.del(key);
        } else {
          const buf =
            value instanceof Uint8Array ? value : new Uint8Array(value);
          await this.db`
            INSERT INTO baileys_keys (k, v) 
            VALUES (${key}, ${buf})
            ON CONFLICT (k) 
            DO UPDATE SET v = EXCLUDED.v
          `;
        }
      } catch (e) {
        global.logger?.error(`SetMany error for ${key}: ${e.message}`);
      }
    }
  }

  async deleteMany(keys) {
    if (this.disposed || keys.length === 0) return;
    if (!this.initialized) await this.init();

    if (keys.length === 1) {
      try {
        await this.db`
          DELETE FROM baileys_keys WHERE k = ${keys[0]}
        `;
      } catch (e) {
        global.logger?.error(`DeleteMany single error: ${e.message}`);
      }
      return;
    }

    const batchSize = 50;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      try {
        await this.db`
          DELETE FROM baileys_keys WHERE k IN (${batch})
        `;
      } catch (e) {
        global.logger?.error(`DeleteMany batch error: ${e.message}`);
      }
    }
  }

  async dispose() {
    if (this.disposed) return;

    try {
      await this.db.close();
    } catch (e) {
      global.logger?.error(`Dispose error: ${e.message}`);
    } finally {
      this.disposed = true;
      this.db = null;
    }
  }

  isHealthy() {
    return !this.disposed && this.db && this.initialized;
  }
}

const core = new DatabaseCore();
export default core;
