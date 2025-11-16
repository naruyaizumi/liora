/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { Database } from "bun:sqlite";
import { Mutex } from "async-mutex";
import {
    DEFAULT_DB,
    logger,
    serialize,
    deserialize,
    validateKey,
    validateValue,
    initializeSignalHandlers,
    registerSignalHandler,
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
}

class AuthDatabase {
    constructor(dbPath = DEFAULT_DB, options = {}) {
        this.dbPath = dbPath;
        this.instanceId = `auth-${Date.now()}-${Bun.randomUUIDv7("base64url")}`;
        this.disposed = false;
        this.isInitialized = false;

        this.cache = new Map();

        try {
            this.db = this._initDatabase();
            this._prepareStatements();
            this._initWriteBuffer(options);
            this._registerCleanup();
            this.isInitialized = true;
        } catch (e) {
            logger.fatal({ err: e.message, context: "AuthDatabase constructor" });
            throw e;
        }
    }

    _initDatabase() {
        try {
            const db = new Database(this.dbPath, {
                create: true,
                readwrite: true,
                strict: true,
            });

            db.exec("PRAGMA journal_mode = WAL");
            db.exec("PRAGMA synchronous = NORMAL");
            db.exec("PRAGMA temp_store = MEMORY");
            db.exec("PRAGMA cache_size = -131072");
            db.exec("PRAGMA mmap_size = 134217728");
            db.exec("PRAGMA page_size = 8192");
            db.exec("PRAGMA auto_vacuum = INCREMENTAL");
            db.exec("PRAGMA busy_timeout = 5000");

            db.exec(`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key   TEXT PRIMARY KEY NOT NULL CHECK(length(key) > 0 AND length(key) < 512),
                    value BLOB NOT NULL CHECK(length(value) > 0)
                ) WITHOUT ROWID;
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_key_prefix ON baileys_state(key) 
                WHERE key LIKE '%-%';
            `);

            return db;
        } catch (e) {
            logger.fatal({ err: e.message, context: "_initDatabase" });
            throw e;
        }
    }

    _prepareStatements() {
        try {
            this.stmtGet = this.db.query("SELECT value FROM baileys_state WHERE key = ?");
            this.stmtSet = this.db.query(
                "INSERT OR REPLACE INTO baileys_state (key, value) VALUES (?, ?)"
            );
            this.stmtDel = this.db.query("DELETE FROM baileys_state WHERE key = ?");

            this.txCommit = this.db.transaction((upsertsArr, deletesArr) => {
                const maxBatch = this.maxBatch;

                for (let i = 0; i < upsertsArr.length; i += maxBatch) {
                    const slice = upsertsArr.slice(i, i + maxBatch);
                    for (const [k, v] of slice) {
                        try {
                            const binaryData = serialize(v);
                            if (binaryData) {
                                this.stmtSet.run(k, binaryData);
                            }
                        } catch (e) {
                            logger.error({ err: e.message, key: k, context: "txCommit upsert" });
                        }
                    }
                }

                for (let i = 0; i < deletesArr.length; i += maxBatch) {
                    const slice = deletesArr.slice(i, i + maxBatch);
                    for (const k of slice) {
                        try {
                            this.stmtDel.run(k);
                        } catch (e) {
                            logger.error({ err: e.message, key: k, context: "txCommit delete" });
                        }
                    }
                }
            });
        } catch (e) {
            logger.fatal({ err: e.message, context: "_prepareStatements" });
            throw e;
        }
    }

    _initWriteBuffer(options) {
        this.writeBuffer = new WriteBuffer();
        this.writeMutex = new Mutex();
        this.flushIntervalMs = Number(options.flushIntervalMs ?? 200);
        this.maxBatch = Number(options.maxBatch ?? 1000);
        this.flushTimer = null;
    }

    _registerCleanup() {
        initializeSignalHandlers();
        registerSignalHandler(this.instanceId, () => this._cleanup());
    }

    get(key) {
        if (!validateKey(key)) return undefined;
        
        if (this.cache.has(key)) {
            return { value: this.cache.get(key) };
        }

        try {
            const row = this.stmtGet.get(key);
            if (!row || !row.value) return undefined;

            const value = deserialize(row.value);
            this.cache.set(key, value);
            return { value };
        } catch (e) {
            logger.error({ err: e.message, key, context: "get" });
            return undefined;
        }
    }

    set(key, value) {
        if (!validateKey(key) || !validateValue(value)) {
            logger.warn({ key, context: "set: invalid key or value" });
            return false;
        }

        this.cache.set(key, value);

        this.writeBuffer.addUpsert(key, value);
        this._scheduleFlush();
        return true;
    }

    del(key) {
        if (!validateKey(key)) {
            logger.warn({ key, context: "del: invalid key" });
            return false;
        }

        this.cache.delete(key);

        this.writeBuffer.addDelete(key);
        this._scheduleFlush();
        return true;
    }

    _scheduleFlush() {
        if (!this.flushTimer && !this.disposed && this.isInitialized) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = null;
                this.flush().catch((e) => {
                    logger.error({ err: e.message, context: "_scheduleFlush" });
                });
            }, this.flushIntervalMs);

            this.flushTimer.unref?.();
        }
    }

    async flush() {
        if (this.disposed || !this.isInitialized) return;

        await this.writeMutex.runExclusive(async () => {
            if (!this.writeBuffer.hasChanges()) return;

            const { upserts, deletes } = this.writeBuffer.toArrays();
            this.writeBuffer.clear();

            try {
                this.txCommit(upserts, deletes);
                this.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
            } catch (e) {
                logger.error({ err: e.message, context: "flush" });

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

    deepClone(obj) {
        if (obj === null || obj === undefined) return obj;

        try {
            const binary = serialize(obj);
            if (!binary) return null;

            const result = deserialize(binary);
            return result;
        } catch (e) {
            logger.error({ err: e.message, context: "deepClone" });
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

            this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
            this.db.exec("PRAGMA incremental_vacuum");
            this.db.exec("PRAGMA optimize");

            this.stmtGet?.finalize();
            this.stmtDel?.finalize();
            this.stmtSet?.finalize();
            this.db.close();

            this.cache.clear();

            logger.info("Auth database cleanup completed");
        } catch (e) {
            logger.error({ err: e.message, context: "_cleanup" });
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