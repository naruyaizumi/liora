import { Database } from "bun:sqlite";
import { Mutex } from "async-mutex";
import NodeCache from "@cacheable/node-cache";
import PQueue from "p-queue";
import { DEFAULT_DB, logger, serialize, deserialize, validateKey, validateValue } from "./database-config.js";
import { initializeSignalHandlers, registerSignalHandler } from "./signal-handler.js";

const CLONE_FAILED = Symbol("CLONE_FAILED");

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

class DatabaseCore {
    constructor(dbPath = DEFAULT_DB, options = {}) {
        this.dbPath = dbPath;
        this.instanceId = `naruyaizumi-${new Date().toISOString()}-${Bun.randomUUIDv7("base64url")}`;
        this.disposed = false;
        this.isInitialized = false;

        try {
            this.db = this._initDatabase();
            this._prepareStatements();
            this._initCache(options);
            this._initQueue(options);
            this._initFlush(options);
            this._registerCleanup();
            this.isInitialized = true;
        } catch (e) {
            logger.fatal({ err: e.message, context: "DatabaseCore constructor" });
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

    _initCache(options) {
        const cacheMax = Number(options.cacheMax ?? 5000);
        const ttlSeconds = Number(options.ttlMs ?? 5 * 60 * 1000) / 1000;
        
        this.cache = new NodeCache({
            max: cacheMax,
            stdTTL: ttlSeconds,
            useClones: false,
            deleteOnExpire: true,
            checkperiod: 60,
        });

        this.cache.on("error", (err) => {
            logger.error({ err: err.message, context: "cache error" });
        });
    }

    _initQueue(options) {
        this.dbQueue = new PQueue({ 
            concurrency: 1,
            throwOnTimeout: false,
            timeout: 30000,
        });

        this.dbQueue.on("error", (err) => {
            logger.error({ err: err.message, context: "queue error" });
        });
    }

    _initFlush(options) {
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
        
        try {
            const row = this.stmtGet.get(key);
            if (!row || !row.value) return undefined;
            
            return { value: deserialize(row.value) };
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

        this.writeBuffer.addUpsert(key, value);
        this._scheduleFlush();
        return true;
    }

    del(key) {
        if (!validateKey(key)) {
            logger.warn({ key, context: "del: invalid key" });
            return false;
        }

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

            await this.dbQueue.add(async () => {
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
        });
    }

    deepClone(obj) {
        if (obj === null || obj === undefined) return obj;
        
        try {
            const binary = serialize(obj);
            if (!binary) return CLONE_FAILED;
            
            const result = deserialize(binary);
            if (result === null && obj !== null) return CLONE_FAILED;
            
            return result;
        } catch (e) {
            logger.error({ err: e.message, context: "deepClone" });
            return CLONE_FAILED;
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

            this.dbQueue.onIdle().then(() => {
                try {
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
                } catch (e) {
                    logger.error({ err: e.message, context: "_cleanup" });
                }
            }).catch((e) => {
                logger.error({ err: e.message, context: "_cleanup onIdle" });
            });
        } catch (e) {
            logger.error({ err: e.message, context: "_cleanup" });
        }
    }
}

let coreInstance = null;

export function getCoreInstance(dbPath = DEFAULT_DB, options = {}) {
    if (!coreInstance || coreInstance.disposed) {
        coreInstance = new DatabaseCore(dbPath, options);
    }
    return coreInstance;
}

const core = getCoreInstance();
export default core;