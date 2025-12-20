import Database from "better-sqlite3";
import { Mutex } from "async-mutex";
import { BufferJSON } from "baileys";
import {
    DEFAULT_DB,
    logger,
    validateKey,
    validateValue,
    initializeSignalHandlers,
    registerSignalHandler,
    ensureDbDirectory,
    createBackup,
} from "./database-config.js";

class WriteBuffer {
    constructor() {
        this.upserts = new Map();
        this.deletes = new Set();
    }

    addUpsert(k, v) {
        if (!validateKey(k)) return false;
        this.upserts.set(k, v);
        this.deletes.delete(k);
        return true;
    }

    addDelete(k) {
        if (!validateKey(k)) return false;
        this.deletes.add(k);
        this.upserts.delete(k);
        return true;
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

    get size() {
        return this.upserts.size + this.deletes.size;
    }
}

class AuthDatabase {
    constructor(dbPath = DEFAULT_DB, options = {}) {
        this.dbPath = dbPath;
        this.instanceId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        this.disposed = false;
        this.isInitialized = false;

        this.cache = new Map();
        this.cacheMaxSize = options.cacheMaxSize || 10000;

        this.stats = {
            reads: 0,
            writes: 0,
            deletes: 0,
            flushes: 0,
            errors: 0,
        };

        ensureDbDirectory(this.dbPath);

        if (options.createBackup) {
            createBackup(this.dbPath);
        }

        this.db = this._initDatabase(options);
        this._prepareStatements();
        this._initWriteBuffer(options);
        this._registerCleanup();

        this.isInitialized = true;
    }

    _initDatabase(options = {}) {
        const db = new Database(this.dbPath, {
            fileMustExist: false,
            timeout: options.timeout || 10000,
        });

        const pragmas = {
            journal_mode: "WAL",
            synchronous: "NORMAL",
            temp_store: "MEMORY",
            cache_size: -131072,
            mmap_size: 134217728,
            page_size: 8192,
            auto_vacuum: "INCREMENTAL",
            foreign_keys: "ON",
            busy_timeout: 5000,
            wal_autocheckpoint: 1000,
        };

        for (const [key, value] of Object.entries(pragmas)) {
            try {
                db.pragma(`${key} = ${value}`);
            } catch (e) {
                logger.warn({ pragma: key, err: e.message }, "Pragma failed");
            }
        }

        db.exec(`
            CREATE TABLE IF NOT EXISTS baileys_state (
                key   TEXT PRIMARY KEY NOT NULL CHECK(length(key) > 0 AND length(key) < 512),
                value BLOB NOT NULL,
                created_at INTEGER DEFAULT (unixepoch()),
                updated_at INTEGER DEFAULT (unixepoch())
            ) WITHOUT ROWID;

            CREATE INDEX IF NOT EXISTS idx_key_prefix 
            ON baileys_state(key) WHERE key LIKE '%-%';

            CREATE TRIGGER IF NOT EXISTS trg_update_timestamp
            AFTER UPDATE ON baileys_state
            BEGIN
                UPDATE baileys_state SET updated_at = unixepoch() WHERE key = NEW.key;
            END;
        `);

        return db;
    }

    _prepareStatements() {
        this.stmtGet = this.db.prepare("SELECT value FROM baileys_state WHERE key = ?");

        this.stmtGetMany = this.db.prepare(`
            SELECT key, value 
            FROM baileys_state 
            WHERE key IN (SELECT value FROM json_each(?))
        `);

        this.stmtSet = this.db.prepare(`
            INSERT INTO baileys_state (key, value, created_at, updated_at)
            VALUES (?, ?, unixepoch(), unixepoch())
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = unixepoch()
        `);

        this.stmtDel = this.db.prepare("DELETE FROM baileys_state WHERE key = ?");

        this.stmtCount = this.db.prepare("SELECT COUNT(*) as count FROM baileys_state");

        this.stmtClear = this.db.prepare("DELETE FROM baileys_state WHERE key LIKE '%-%'");

        this.txCommit = this.db.transaction((upsertsArr, deletesArr) => {
            const maxBatch = this.maxBatch;

            for (let i = 0; i < upsertsArr.length; i += maxBatch) {
                const slice = upsertsArr.slice(i, i + maxBatch);
                for (const [k, v] of slice) {
                    try {
                        const jsonStr = JSON.stringify(v, BufferJSON.replacer);
                        const binaryData = Buffer.from(jsonStr, "utf-8");
                        this.stmtSet.run(k, binaryData);
                    } catch (e) {
                        this.stats.errors++;
                        logger.error({ err: e, key: k }, "Upsert failed");
                    }
                }
            }

            for (let i = 0; i < deletesArr.length; i += maxBatch) {
                const slice = deletesArr.slice(i, i + maxBatch);
                for (const k of slice) {
                    try {
                        this.stmtDel.run(k);
                    } catch (e) {
                        this.stats.errors++;
                        logger.error({ err: e, key: k }, "Delete failed");
                    }
                }
            }
        });
    }

    _initWriteBuffer(options) {
        this.writeBuffer = new WriteBuffer();
        this.writeMutex = new Mutex();
        this.flushIntervalMs = Number(options.flushIntervalMs ?? 500);
        this.maxBatch = Number(options.maxBatch ?? 1000);
        this.flushTimer = null;
        this.autoFlushEnabled = options.autoFlush !== false;
    }

    _registerCleanup() {
        initializeSignalHandlers();
        registerSignalHandler(this.instanceId, () => this._cleanup());
    }

    _evictCache() {
        if (this.cache.size <= this.cacheMaxSize) return;

        const toDelete = this.cache.size - this.cacheMaxSize;
        const iterator = this.cache.keys();

        for (let i = 0; i < toDelete; i++) {
            const key = iterator.next().value;
            if (key) this.cache.delete(key);
        }
    }

    get(key) {
        if (!validateKey(key)) return undefined;

        this.stats.reads++;

        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return { value };
        }

        try {
            const row = this.stmtGet.get(key);
            if (!row?.value) return undefined;

            const value = this._deserializeValue(row.value);
            if (value !== null) {
                this.cache.set(key, value);
                this._evictCache();
                return { value };
            }
            return undefined;
        } catch (e) {
            this.stats.errors++;
            logger.error({ err: e, key }, "Get failed");
            return undefined;
        }
    }

    getMany(keys) {
        if (!Array.isArray(keys) || keys.length === 0) return {};

        this.stats.reads += keys.length;

        const result = {};
        const uncachedKeys = [];

        for (const key of keys) {
            if (!validateKey(key)) continue;

            if (this.cache.has(key)) {
                result[key] = this.cache.get(key);
                this.cache.delete(key);
                this.cache.set(key, result[key]);
            } else {
                uncachedKeys.push(key);
            }
        }

        if (uncachedKeys.length > 0) {
            try {
                const keysJson = JSON.stringify(uncachedKeys);
                const rows = this.stmtGetMany.all(keysJson);

                for (const row of rows) {
                    try {
                        const value = this._deserializeValue(row.value);
                        if (value !== null) {
                            result[row.key] = value;
                            this.cache.set(row.key, value);
                        }
                    } catch (e) {
                        this.stats.errors++;
                        logger.error({ err: e, key: row.key }, "Parse failed");
                    }
                }

                this._evictCache();
            } catch (e) {
                this.stats.errors++;
                logger.error({ err: e }, "GetMany failed");
            }
        }

        return result;
    }

    set(key, value) {
        if (!validateKey(key) || !validateValue(value)) return false;

        this.stats.writes++;
        this.cache.set(key, value);
        this._evictCache();
        this.writeBuffer.addUpsert(key, value);

        if (this.autoFlushEnabled) {
            this._scheduleFlush();
        }

        return true;
    }

    del(key) {
        if (!validateKey(key)) return false;

        this.stats.deletes++;
        this.cache.delete(key);
        this.writeBuffer.addDelete(key);

        if (this.autoFlushEnabled) {
            this._scheduleFlush();
        }

        return true;
    }

    _scheduleFlush() {
        if (!this.flushTimer && !this.disposed && this.isInitialized) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = null;
                this.flush().catch((e) => {
                    this.stats.errors++;
                    logger.error({ err: e }, "Scheduled flush failed");
                });
            }, this.flushIntervalMs);

            if (this.flushTimer.unref) {
                this.flushTimer.unref();
            }
        }
    }

    async flush() {
        if (this.disposed || !this.isInitialized) return;

        await this.writeMutex.runExclusive(async () => {
            if (!this.writeBuffer.hasChanges()) return;

            const { upserts, deletes } = this.writeBuffer.toArrays();
            this.writeBuffer.clear();

            try {
                if (this.stats.flushes % 10 === 0) {
                    this.db.pragma("wal_checkpoint(PASSIVE)");
                }

                this.txCommit(upserts, deletes);
                this.stats.flushes++;
            } catch (e) {
                this.stats.errors++;
                logger.error({ err: e }, "Flush failed");

                for (const [k, v] of upserts) {
                    this.writeBuffer.addUpsert(k, v);
                }
                for (const k of deletes) {
                    this.writeBuffer.addDelete(k);
                }

                throw e;
            }
        });
    }

    _deserializeValue(buffer) {
        try {
            let jsonStr;

            if (Buffer.isBuffer(buffer)) {
                jsonStr = buffer.toString("utf-8");
            } else if (buffer instanceof Uint8Array) {
                jsonStr = Buffer.from(buffer).toString("utf-8");
            } else if (typeof buffer === "string") {
                jsonStr = buffer;
            } else {
                return null;
            }

            return JSON.parse(jsonStr, BufferJSON.reviver);
        } catch (e) {
            logger.error({ err: e }, "Deserialize failed");
            return null;
        }
    }

    _cleanup() {
        if (this.disposed) return;
        this.disposed = true;

        try {
            if (this.flushTimer) {
                clearTimeout(this.flushTimer);
                this.flushTimer = null;
            }

            const { upserts, deletes } = this.writeBuffer.toArrays();
            if (upserts.length || deletes.length) {
                this.txCommit(upserts, deletes);
            }

            this.db.pragma("wal_checkpoint(TRUNCATE)");

            const statements = [
                this.stmtGet,
                this.stmtGetMany,
                this.stmtSet,
                this.stmtDel,
                this.stmtCount,
                this.stmtClear,
            ];

            for (const stmt of statements) {
                if (stmt && typeof stmt.finalize === "function") {
                    try {
                        stmt.finalize();
                    } catch (e) {
                        logger.warn({ err: e }, "Statement finalize failed");
                    }
                }
            }

            this.db.close();
            this.cache.clear();
        } catch (e) {
            this.stats.errors++;
            logger.error({ err: e }, "Cleanup failed");
        }
    }

    getStats() {
        try {
            return {
                ...this.stats,
                cache: {
                    size: this.cache.size,
                    maxSize: this.cacheMaxSize,
                },
                database: {
                    pageCount: this.db.pragma("page_count", { simple: true }),
                    rowCount: this.stmtCount.get().count,
                },
                writeBuffer: {
                    size: this.writeBuffer.size,
                },
            };
        } catch (e) {
            logger.error({ err: e }, "GetStats failed");
            return null;
        }
    }

    clearAll() {
        try {
            this.stmtClear.run();
            this.cache.clear();
            this.writeBuffer.clear();
            return true;
        } catch (e) {
            logger.error({ err: e }, "ClearAll failed");
            return false;
        }
    }
}

let dbInstance = null;

export function getAuthDatabase(dbPath = DEFAULT_DB, options = {}) {
    if (!dbInstance || dbInstance.disposed) {
        dbInstance = new AuthDatabase(dbPath, options);
    }
    return dbInstance;
}

export default getAuthDatabase();
