/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
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
        this.operations = 0;
    }

    addUpsert(k, v) {
        if (!validateKey(k)) {
            logger.debug({ key: k }, "Invalid key for upsert");
            return false;
        }
        
        this.upserts.set(k, v);
        this.deletes.delete(k);
        this.operations++;
        return true;
    }

    addDelete(k) {
        if (!validateKey(k)) {
            logger.debug({ key: k }, "Invalid key for delete");
            return false;
        }
        
        this.deletes.add(k);
        this.upserts.delete(k);
        this.operations++;
        return true;
    }

    clear() {
        this.upserts.clear();
        this.deletes.clear();
        this.operations = 0;
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
        this.lastError = null;
        this.errorCount = 0;

        this.cache = new Map();
        this.cacheMaxSize = options.cacheMaxSize || 10000;
        this.cacheHits = 0;
        this.cacheMisses = 0;

        this.stats = {
            reads: 0,
            writes: 0,
            deletes: 0,
            flushes: 0,
            errors: 0,
            lastFlush: null,
        };

        try {
            ensureDbDirectory(this.dbPath);
            
            if (options.createBackup) {
                createBackup(this.dbPath, options.backupDir);
            }
            
            this.db = this._initDatabase(options);
            this._prepareStatements();
            this._initWriteBuffer(options);
            this._registerCleanup();
            this._startHealthCheck(options.healthCheckInterval);
            
            this.isInitialized = true;
            logger.info({ 
                dbPath: this.dbPath,
                instanceId: this.instanceId 
            }, "AuthDatabase initialized successfully");
        } catch (e) {
            this.lastError = e;
            logger.fatal({ 
                err: e,
                dbPath: this.dbPath,
                context: "AuthDatabase constructor" 
            }, "Failed to initialize AuthDatabase");
            throw e;
        }
    }

    _initDatabase(options = {}) {
        try {
            const db = new Database(this.dbPath, {
                verbose: process.env.DEBUG_SQL ? logger.debug.bind(logger) : null,
                fileMustExist: false,
                timeout: options.timeout || 10000,
                readonly: options.readonly || false,
            });

            const pragmas = {
                journal_mode: "WAL",
                synchronous: options.synchronous || "NORMAL",
                temp_store: "MEMORY",
                cache_size: options.cacheSize || -131072,
                mmap_size: options.mmapSize || 134217728,
                page_size: 8192,
                auto_vacuum: "INCREMENTAL",
                foreign_keys: "ON",
                query_only: "OFF",
                locking_mode: "NORMAL",
                wal_autocheckpoint: 1000,
                busy_timeout: options.busyTimeout || 5000,
                journal_size_limit: 67108864,
            };

            for (const [key, value] of Object.entries(pragmas)) {
                try {
                    db.pragma(`${key} = ${value}`);
                } catch (e) {
                    logger.warn({ 
                        pragma: key,
                        value,
                        err: e.message 
                    }, "Failed to set pragma");
                }
            }

            db.exec(`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key   TEXT PRIMARY KEY NOT NULL CHECK(length(key) > 0 AND length(key) < 512),
                    value BLOB NOT NULL,
                    created_at INTEGER DEFAULT (unixepoch()),
                    updated_at INTEGER DEFAULT (unixepoch())
                ) WITHOUT ROWID;
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_key_prefix 
                ON baileys_state(key) WHERE key LIKE '%-%';
            `);
            
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_updated_at 
                ON baileys_state(updated_at DESC);
            `);

            db.exec(`
                CREATE TRIGGER IF NOT EXISTS trg_update_timestamp
                AFTER UPDATE ON baileys_state
                BEGIN
                    UPDATE baileys_state SET updated_at = unixepoch() WHERE key = NEW.key;
                END;
            `);

            db.exec("ANALYZE baileys_state");
            db.pragma("optimize");

            logger.info("Database initialized with optimized schema");
            return db;
        } catch (e) {
            logger.fatal({ err: e, context: "_initDatabase" }, "Database initialization failed");
            throw e;
        }
    }

    _prepareStatements() {
        try {
            this.stmtGet = this.db.prepare(
                "SELECT value, updated_at FROM baileys_state WHERE key = ?"
            );
            
            this.stmtGetMany = this.db.prepare(`
                SELECT key, value, updated_at 
                FROM baileys_state 
                WHERE key IN (SELECT value FROM json_each(?))
            `);
            
            this.stmtGetAll = this.db.prepare(
                "SELECT key, value FROM baileys_state"
            );

            this.stmtSet = this.db.prepare(`
                INSERT INTO baileys_state (key, value, created_at, updated_at)
                VALUES (?, ?, unixepoch(), unixepoch())
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = unixepoch()
            `);
            
            this.stmtDel = this.db.prepare(
                "DELETE FROM baileys_state WHERE key = ?"
            );

            this.stmtCount = this.db.prepare(
                "SELECT COUNT(*) as count FROM baileys_state"
            );
            
            this.stmtClear = this.db.prepare(
                "DELETE FROM baileys_state WHERE key LIKE '%-%'"
            );

            this.txCommit = this.db.transaction((upsertsArr, deletesArr) => {
                const maxBatch = this.maxBatch;
                let processed = 0;

                for (let i = 0; i < upsertsArr.length; i += maxBatch) {
                    const slice = upsertsArr.slice(i, i + maxBatch);
                    
                    for (const [k, v] of slice) {
                        try {
                            const jsonStr = JSON.stringify(v, BufferJSON.replacer);
                            const binaryData = Buffer.from(jsonStr, "utf-8");
                            this.stmtSet.run(k, binaryData);
                            processed++;
                        } catch (e) {
                            this.stats.errors++;
                            logger.error({ 
                                err: e,
                                key: k,
                                context: "txCommit upsert" 
                            }, "Failed to upsert key");
                        }
                    }
                }

                for (let i = 0; i < deletesArr.length; i += maxBatch) {
                    const slice = deletesArr.slice(i, i + maxBatch);
                    
                    for (const k of slice) {
                        try {
                            this.stmtDel.run(k);
                            processed++;
                        } catch (e) {
                            this.stats.errors++;
                            logger.error({ 
                                err: e,
                                key: k,
                                context: "txCommit delete" 
                            }, "Failed to delete key");
                        }
                    }
                }

                return processed;
            });

            logger.debug("Prepared statements created");
        } catch (e) {
            logger.fatal({ err: e, context: "_prepareStatements" }, "Failed to prepare statements");
            throw e;
        }
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
    
    _startHealthCheck(interval = 60000) {
        if (!interval || interval <= 0) return;
        
        this.healthCheckTimer = setInterval(() => {
            try {
                this._performHealthCheck();
            } catch (e) {
                logger.error({ err: e, context: "healthCheck" }, "Health check failed");
            }
        }, interval);
        
        if (this.healthCheckTimer.unref) {
            this.healthCheckTimer.unref();
        }
    }
    
    _performHealthCheck() {
        try {
            const result = this.db.pragma("quick_check", { simple: true });
            
            if (result !== "ok") {
                logger.warn({ result }, "Database quick check failed");
                this.errorCount++;
            }
            
            const walInfo = this.db.pragma("wal_checkpoint(PASSIVE)");
            logger.debug({ walInfo }, "WAL checkpoint info");
            
            logger.info({
                stats: this.stats,
                cacheSize: this.cache.size,
                cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
                writeBufferSize: this.writeBuffer.size,
            }, "Database health check");
            
        } catch (e) {
            logger.error({ err: e, context: "_performHealthCheck" });
            this.errorCount++;
        }
    }

    _evictCache() {
        if (this.cache.size <= this.cacheMaxSize) return;
        
        const toDelete = this.cache.size - this.cacheMaxSize;
        const iterator = this.cache.keys();
        
        for (let i = 0; i < toDelete; i++) {
            const key = iterator.next().value;
            if (key) this.cache.delete(key);
        }
        
        logger.debug({ 
            deleted: toDelete,
            remaining: this.cache.size 
        }, "Cache evicted");
    }

    get(key) {
        if (!validateKey(key)) {
            logger.debug({ key }, "Invalid key in get");
            return undefined;
        }

        this.stats.reads++;

        if (this.cache.has(key)) {
            this.cacheHits++;
            const value = this.cache.get(key);
            
            this.cache.delete(key);
            this.cache.set(key, value);
            
            return { value };
        }

        this.cacheMisses++;

        try {
            const row = this.stmtGet.get(key);
            if (!row || !row.value) return undefined;
            
            const value = this._deserializeValue(row.value);
            
            if (value !== null) {
                this.cache.set(key, value);
                this._evictCache();
                return { value };
            }
            
            return undefined;
        } catch (e) {
            this.stats.errors++;
            this.lastError = e;
            logger.error({ err: e, key, context: "get" }, "Failed to get key");
            return undefined;
        }
    }

    getMany(keys) {
        if (!Array.isArray(keys) || keys.length === 0) {
            return {};
        }

        this.stats.reads += keys.length;

        const result = {};
        const uncachedKeys = [];

        for (const key of keys) {
            if (!validateKey(key)) continue;
            
            if (this.cache.has(key)) {
                this.cacheHits++;
                result[key] = this.cache.get(key);
                
                this.cache.delete(key);
                this.cache.set(key, result[key]);
            } else {
                this.cacheMisses++;
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
                        logger.error({ 
                            err: e,
                            key: row.key,
                            context: "getMany parse" 
                        }, "Failed to parse value");
                    }
                }
                
                this._evictCache();
            } catch (e) {
                this.stats.errors++;
                this.lastError = e;
                logger.error({ err: e, context: "getMany" }, "Failed to get many keys");
            }
        }

        return result;
    }

    set(key, value) {
        if (!validateKey(key) || !validateValue(value)) {
            logger.debug({ key }, "Invalid key or value in set");
            return false;
        }

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
        if (!validateKey(key)) {
            logger.debug({ key }, "Invalid key in del");
            return false;
        }

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
                    logger.error({ err: e, context: "_scheduleFlush" });
                });
            }, this.flushIntervalMs);

            if (this.flushTimer.unref) {
                this.flushTimer.unref();
            }
        }
    }

    async flush() {
        if (this.disposed || !this.isInitialized) {
            logger.debug("Flush skipped: database disposed or not initialized");
            return;
        }

        await this.writeMutex.runExclusive(async () => {
            if (!this.writeBuffer.hasChanges()) {
                return;
            }

            const { upserts, deletes } = this.writeBuffer.toArrays();
            const totalOps = upserts.length + deletes.length;
            
            this.writeBuffer.clear();

            const startTime = Date.now();
            
            try {
                const processed = this.txCommit(upserts, deletes);
                
                if (this.stats.flushes % 10 === 0) {
                    this.db.pragma("wal_checkpoint(PASSIVE)");
                }
                
                this.stats.flushes++;
                this.stats.lastFlush = new Date();
                
                const duration = Date.now() - startTime;
                
                logger.debug({
                    operations: totalOps,
                    processed,
                    duration,
                    context: "flush"
                }, "Flush completed");
                
            } catch (e) {
                this.stats.errors++;
                this.lastError = e;
                this.errorCount++;
                
                logger.error({ 
                    err: e,
                    operations: totalOps,
                    context: "flush" 
                }, "Flush failed, re-queuing operations");

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
                logger.error({
                    valueType: typeof buffer,
                    context: "_deserializeValue: unknown value type",
                });
                return null;
            }
            
            return JSON.parse(jsonStr, BufferJSON.reviver);
        } catch (e) {
            logger.error({ err: e, context: "_deserializeValue" });
            return null;
        }
    }

    _cleanup() {
        if (this.disposed) {
            logger.debug("Cleanup skipped: already disposed");
            return;
        }
        
        this.disposed = true;
        logger.info({ instanceId: this.instanceId }, "Starting cleanup");

        try {
            if (this.flushTimer) {
                clearTimeout(this.flushTimer);
                this.flushTimer = null;
            }
            
            if (this.healthCheckTimer) {
                clearInterval(this.healthCheckTimer);
                this.healthCheckTimer = null;
            }

            const { upserts, deletes } = this.writeBuffer.toArrays();
            if (upserts.length || deletes.length) {
                logger.info({ 
                    upserts: upserts.length,
                    deletes: deletes.length 
                }, "Flushing pending operations");
                
                this.txCommit(upserts, deletes);
            }

            this.db.pragma("wal_checkpoint(TRUNCATE)");
            this.db.pragma("incremental_vacuum");
            this.db.pragma("optimize");
            
            const statements = [
                this.stmtGet,
                this.stmtGetMany,
                this.stmtGetAll,
                this.stmtSet,
                this.stmtDel,
                this.stmtCount,
                this.stmtClear,
            ];
            
            for (const stmt of statements) {
                try {
                    stmt?.finalize();
                } catch (e) {
                    logger.warn({ err: e }, "Failed to finalize statement");
                }
            }
            
            this.db.close();
            
            this.cache.clear();
            
            logger.info({ 
                instanceId: this.instanceId,
                stats: this.stats,
            }, "Cleanup completed successfully");
            
        } catch (e) {
            this.stats.errors++;
            logger.error({ err: e, context: "_cleanup" }, "Cleanup failed");
        }
    }

    integrityCheck() {
        try {
            const result = this.db.pragma("integrity_check");
            const isOk = result[0].integrity_check === "ok";
            
            logger.info({ isOk }, "Integrity check completed");
            return isOk;
        } catch (e) {
            this.stats.errors++;
            logger.error({ err: e, context: "integrityCheck" });
            return false;
        }
    }

    getStats() {
        try {
            const dbStats = {
                pageCount: this.db.pragma("page_count", { simple: true }),
                pageSize: this.db.pragma("page_size", { simple: true }),
                cacheSize: this.db.pragma("cache_size", { simple: true }),
                walMode: this.db.pragma("journal_mode", { simple: true }),
                rowCount: this.stmtCount.get().count,
            };
            
            return {
                ...this.stats,
                cache: {
                    size: this.cache.size,
                    maxSize: this.cacheMaxSize,
                    hits: this.cacheHits,
                    misses: this.cacheMisses,
                    hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
                },
                database: dbStats,
                writeBuffer: {
                    size: this.writeBuffer.size,
                    operations: this.writeBuffer.operations,
                },
                errors: {
                    count: this.errorCount,
                    lastError: this.lastError?.message,
                },
            };
        } catch (e) {
            logger.error({ err: e, context: "getStats" });
            return null;
        }
    }

    vacuum() {
        try {
            logger.info("Starting vacuum operation");
            this.db.exec("VACUUM");
            logger.info("Vacuum completed");
            return true;
        } catch (e) {
            logger.error({ err: e, context: "vacuum" });
            return false;
        }
    }

    clearAll() {
        try {
            logger.warn("Clearing all data from database");
            this.stmtClear.run();
            this.cache.clear();
            this.writeBuffer.clear();
            logger.info("All data cleared");
            return true;
        } catch (e) {
            logger.error({ err: e, context: "clearAll" });
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