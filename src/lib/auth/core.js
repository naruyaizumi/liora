/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";
import { BufferJSON } from "baileys";
import Database from "better-sqlite3";
import { Mutex } from "async-mutex";

const DEFAULT_DB = path.join(process.cwd(), "src", "database", "auth.db");

export const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);
export const parse = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str, BufferJSON.reviver);
    } catch (e) {
        global.logger.error(`Parse error: ${e.message}`);
        return null;
    }
};

export const makeKey = (type, id) => `${type}-${id}`;

class DatabaseCore {
    constructor(dbPath = DEFAULT_DB) {
        this.dbPath = dbPath;
        this.db = this._initDatabase();
        this.writeMutex = new Mutex();
        this.disposed = false;

        this.stmtGet = this.db.prepare("SELECT value FROM baileys_state WHERE key = ?");
        this.stmtSet = this.db.prepare(
            "INSERT OR REPLACE INTO baileys_state (key, value) VALUES (?, ?)"
        );
        this.stmtDel = this.db.prepare("DELETE FROM baileys_state WHERE key = ?");
        this.stmtGetMany = this.db.prepare("SELECT key, value FROM baileys_state WHERE key IN (SELECT value FROM json_each(?))");
        
        this.txBatch = this.db.transaction((operations) => {
            for (const op of operations) {
                if (op.type === 'set') {
                    this.stmtSet.run(op.key, op.value);
                } else if (op.type === 'del') {
                    this.stmtDel.run(op.key);
                }
            }
        });
    }

    _initDatabase() {
        try {
            const db = new Database(this.dbPath, { timeout: 5000 });

            db.pragma("journal_mode = WAL");
            db.pragma("synchronous = NORMAL");
            db.pragma("temp_store = MEMORY");
            db.pragma("cache_size = -64000");
            db.pragma("mmap_size = 134217728");

            db.exec(`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                ) WITHOUT ROWID;
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_key_prefix 
                ON baileys_state(key) 
                WHERE key LIKE '%-%';
            `);

            return db;
        } catch (e) {
            global.logger.fatal(`Database init error: ${e.message}`);
            process.exit(1);
        }
    }

    get(key) {
        if (this.disposed) return null;
        try {
            const row = this.stmtGet.get(key);
            return row ? parse(row.value) : null;
        } catch (e) {
            global.logger.error(`Get error for key ${key}: ${e.message}`);
            return null;
        }
    }

    getMany(keys) {
        if (this.disposed) return {};
        if (!keys.length) return {};
        
        try {
            const rows = this.stmtGetMany.all(JSON.stringify(keys));
            const result = {};
            for (const row of rows) {
                result[row.key] = parse(row.value);
            }
            return result;
        } catch (e) {
            global.logger.error(`GetMany error: ${e.message}`);
            return {};
        }
    }

    async set(key, value) {
        if (this.disposed) return;
        await this.writeMutex.runExclusive(() => {
            try {
                this.stmtSet.run(key, stringify(value));
            } catch (e) {
                global.logger.error(`Set error for key ${key}: ${e.message}`);
            }
        });
    }

    async del(key) {
        if (this.disposed) return;
        await this.writeMutex.runExclusive(() => {
            try {
                this.stmtDel.run(key);
            } catch (e) {
                global.logger.error(`Delete error for key ${key}: ${e.message}`);
            }
        });
    }

    async batch(operations) {
        if (this.disposed) return;
        if (!operations.length) return;

        await this.writeMutex.runExclusive(() => {
            try {
                this.txBatch(operations);
            } catch (e) {
                global.logger.error(`Batch error: ${e.message}`);
                throw e;
            }
        });
    }

    async clear() {
        if (this.disposed) return;
        await this.writeMutex.runExclusive(() => {
            try {
                this.db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            } catch (e) {
                global.logger.error(`Clear error: ${e.message}`);
                throw e;
            }
        });
    }

    async dispose() {
        if (this.disposed) return;
        
        await this.writeMutex.runExclusive(() => {
            try {
                this.stmtGet?.finalize();
                this.stmtSet?.finalize();
                this.stmtDel?.finalize();
                this.stmtGetMany?.finalize();

                if (this.db) {
                    this.db.pragma("wal_checkpoint(TRUNCATE)");
                    this.db.pragma("optimize");
                    this.db.close();
                }

                this.disposed = true;
            } catch (e) {
                global.logger.error(`Dispose error: ${e.message}`);
            }
        });
    }

    isHealthy() {
        return !this.disposed && this.db !== null;
    }
}

const core = new DatabaseCore(DEFAULT_DB);
export default core;