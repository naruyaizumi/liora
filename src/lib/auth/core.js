/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";
import { BufferJSON } from "baileys";
import Database from "better-sqlite3";
import { Mutex } from "async-mutex";
import NodeCache from "@cacheable/node-cache";
import PQueue from "p-queue";

const DEFAULT_DB = path.join(process.cwd(), "src", "database", "auth.db");
const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);
export const parse = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str, BufferJSON.reviver);
    } catch (e) {
        global.logger.error(e.message);
        return null;
    }
};

export const makeKey = (type, id) => `${type}-${id}`;

const CLONE_FAILED = Symbol("CLONE_FAILED");
const MAX_CLONE_DEPTH = 50;

class WriteBuffer {
    constructor() {
        this.upserts = new Map();
        this.deletes = new Set();
    }
    addUpsert(k, v) {
        this.upserts.set(k, v);
        this.deletes.delete(k);
    }
    addDelete(k) {
        this.deletes.add(k);
        this.upserts.delete(k);
    }
    clear() {
        this.upserts.clear();
        this.deletes.clear();
    }
    hasChanges() {
        return this.upserts.size > 0 || this.deletes.size > 0;
    }
    toArrays() {
        return {
            upserts: Array.from(this.upserts.entries()),
            deletes: Array.from(this.deletes.values()),
        };
    }
}

class DatabaseCore {
    constructor(dbPath = DEFAULT_DB, options = {}) {
        this.dbPath = dbPath;
        this.instanceId = `DatabaseCore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.db = this._initDatabase();
        this.stmtGet = this.db.prepare("SELECT value FROM baileys_state WHERE key = ?");
        this.stmtSet = this.db.prepare(
            "INSERT OR REPLACE INTO baileys_state (key, value) VALUES (?, ?)"
        );
        this.stmtDel = this.db.prepare("DELETE FROM baileys_state WHERE key = ?");

        const cacheMax = Number(options.cacheMax ?? 5000);
        const ttlSeconds = Number(options.ttlMs ?? 5 * 60 * 1000) / 1000;
        this.cache = new NodeCache({
            max: cacheMax,
            stdTTL: ttlSeconds,
            useClones: false,
            deleteOnExpire: true,
        });

        this.cache.on("del", () => {});

        this.dbQueue = new PQueue({ concurrency: 1 });
        this.writeBuffer = new WriteBuffer();
        this.writeMutex = new Mutex();
        this.flushIntervalMs = Number(options.flushIntervalMs ?? 200);
        this.maxBatch = Number(options.maxBatch ?? 1000);
        this.flushTimer = null;
        this.disposed = false;
        this.isCleaningUp = false;

        this.txCommit = this.db.transaction((upsertsArr, deletesArr) => {
            for (let i = 0; i < upsertsArr.length; i += this.maxBatch) {
                const slice = upsertsArr.slice(i, i + this.maxBatch);
                for (const [k, v] of slice) {
                    this.stmtSet.run(k, stringify(v));
                }
            }
            for (let i = 0; i < deletesArr.length; i += this.maxBatch) {
                const slice = deletesArr.slice(i, i + this.maxBatch);
                for (const k of slice) {
                    this.stmtDel.run(k);
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
            db.pragma("cache_size = -131072");
            db.pragma("mmap_size = 134217728");

            db.exec(`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            `);
            return db;
        } catch (e) {
            global.logger.fatal(e.message);
            process.exit(1);
        }
    }

    get(key) {
        if (this.disposed) return undefined;
        try {
            return this.stmtGet.get(key);
        } catch (e) {
            global.logger.error(e.message);
            return undefined;
        }
    }

    set(key, value) {
        if (this.disposed || this.isCleaningUp) return;
        this.writeBuffer.addUpsert(key, value);
        this._scheduleFlush();
    }

    del(key) {
        if (this.disposed || this.isCleaningUp) return;
        this.writeBuffer.addDelete(key);
        this._scheduleFlush();
    }

    _scheduleFlush() {
        if (!this.flushTimer && !this.disposed && !this.isCleaningUp) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = null;
                this.flush().catch((err) => {
                    if (!this.disposed) {
                        global.logger.error(`Flush error: ${err.message}`);
                    }
                });
            }, this.flushIntervalMs);
        }
    }

    async flush() {
        if (this.disposed || this.isCleaningUp) return;

        await this.writeMutex.runExclusive(async () => {
            if (!this.writeBuffer.hasChanges()) return;

            const { upserts, deletes } = this.writeBuffer.toArrays();
            this.writeBuffer.clear();

            await this.dbQueue.add(() => {
                if (this.disposed) return;
                try {
                    this.txCommit(upserts, deletes);
                    this.db.pragma("wal_checkpoint(PASSIVE)");
                } catch (e) {
                    if (!this.disposed) {
                        global.logger.error(`Transaction error: ${e.message}`);
                    }
                }
            });
        });
    }

    deepClone(obj, depth = 0) {
        if (obj === null || obj === undefined) return obj;
        if (depth > MAX_CLONE_DEPTH) {
            global.logger.warn("Max clone depth reached");
            return CLONE_FAILED;
        }

        try {
            const serialized = stringify(obj);
            const result = parse(serialized);
            if (result === null) return CLONE_FAILED;
            return result;
        } catch (e) {
            global.logger.error(`Clone error: ${e.message}`);
            return CLONE_FAILED;
        }
    }

    async dispose() {
        if (this.disposed || this.isCleaningUp) return;

        this.isCleaningUp = true;

        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Cleanup timeout")), 5000)
            );

            await Promise.race([this.dbQueue.onIdle(), timeout]).catch(() => {
                global.logger.warn("Database queue cleanup timeout");
            });

            const { upserts, deletes } = this.writeBuffer.toArrays();
            if (upserts.length || deletes.length) {
                this.txCommit(upserts, deletes);
            }
            this.writeBuffer.clear();

            this.cache.flushAll();
            this.cache.removeAllListeners();

            if (this.db && !this.disposed) {
                this.db.pragma("wal_checkpoint(TRUNCATE)");
                this.db.pragma("optimize");
                this.db.close();
            }
        } catch (e) {
            global.logger.error(`Dispose error: ${e.message}`);
        } finally {
            this.disposed = true;

            this.stmtGet = null;
            this.stmtSet = null;
            this.stmtDel = null;
            this.txCommit = null;
            this.db = null;
            this.cache = null;
            this.writeBuffer = null;
        }
    }

    isHealthy() {
        return !this.disposed && !this.isCleaningUp && this.db !== null;
    }
}

const core = new DatabaseCore(DEFAULT_DB);
export default core;
