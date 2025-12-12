/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import Database from "better-sqlite3";
import { Mutex } from "async-mutex";
import { BufferJSON } from "baileys";
import fs from "fs";
import path from "path";
import {
    DEFAULT_DB,
    logger,
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
        this.instanceId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        this.disposed = false;
        this.isInitialized = false;

        this.cache = new Map();

        try {
            this._ensureDbDirectory();
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

    _ensureDbDirectory() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    _initDatabase() {
        try {
            const db = new Database(this.dbPath, {
                verbose: process.env.DEBUG_SQL ? logger.debug : null,
                fileMustExist: false,
                timeout: 5000,
            });

            db.pragma("journal_mode = WAL");
            db.pragma("synchronous = FULL");
            db.pragma("temp_store = MEMORY");
            db.pragma("cache_size = -131072");
            db.pragma("mmap_size = 134217728");
            db.pragma("page_size = 8192");
            db.pragma("auto_vacuum = INCREMENTAL");
            db.pragma("foreign_keys = ON");
            db.pragma("query_only = OFF");
            db.pragma("locking_mode = NORMAL");
            db.pragma("wal_autocheckpoint = 1000");

            db.exec(`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key   TEXT PRIMARY KEY NOT NULL CHECK(length(key) > 0 AND length(key) < 512),
                    value BLOB NOT NULL
                ) WITHOUT ROWID;
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_key_prefix ON baileys_state(key) 
                WHERE key LIKE '%-%';
            `);

            db.exec("ANALYZE baileys_state");

            return db;
        } catch (e) {
            logger.fatal({ err: e.message, context: "_initDatabase" });
            throw e;
        }
    }

    _prepareStatements() {
        try {
            this.stmtGet = this.db.prepare("SELECT value FROM baileys_state WHERE key = ?");
            this.stmtSet = this.db.prepare(
                "INSERT INTO baileys_state (key, value) VALUES (?, ?) " +
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
            );
            this.stmtDel = this.db.prepare("DELETE FROM baileys_state WHERE key = ?");
            
            this.stmtGetMany = this.db.prepare(
                "SELECT key, value FROM baileys_state WHERE key IN (SELECT value FROM json_each(?))"
            );

            this.txCommit = this.db.transaction((upsertsArr, deletesArr) => {
                const maxBatch = this.maxBatch;

                for (let i = 0; i < upsertsArr.length; i += maxBatch) {
                    const slice = upsertsArr.slice(i, i + maxBatch);
                    for (const [k, v] of slice) {
                        try {
                            const jsonStr = JSON.stringify(v, BufferJSON.replacer);
                            const binaryData = Buffer.from(jsonStr);
                            this.stmtSet.run(k, binaryData);
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
            
            let jsonStr;
            if (Buffer.isBuffer(row.value)) {
                jsonStr = row.value.toString("utf-8");
            } else if (row.value instanceof Uint8Array) {
                jsonStr = Buffer.from(row.value).toString("utf-8");
            } else if (typeof row.value === "string") {
                jsonStr = row.value;
            } else {
                logger.error({
                    key,
                    valueType: typeof row.value,
                    context: "get: unknown value type",
                });
                return undefined;
            }
            
            const value = JSON.parse(jsonStr, BufferJSON.reviver);

            this.cache.set(key, value);
            return { value };
        } catch (e) {
            logger.error({ err: e.message, key, context: "get" });
            return undefined;
        }
    }

    getMany(keys) {
        if (!Array.isArray(keys) || keys.length === 0) return {};

        const result = {};
        const uncachedKeys = [];

        for (const key of keys) {
            if (!validateKey(key)) continue;
            
            if (this.cache.has(key)) {
                result[key] = this.cache.get(key);
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
                        let jsonStr;
                        if (Buffer.isBuffer(row.value)) {
                            jsonStr = row.value.toString("utf-8");
                        } else if (row.value instanceof Uint8Array) {
                            jsonStr = Buffer.from(row.value).toString("utf-8");
                        } else if (typeof row.value === "string") {
                            jsonStr = row.value;
                        } else {
                            continue;
                        }
                        
                        const value = JSON.parse(jsonStr, BufferJSON.reviver);
                        result[row.key] = value;
                        this.cache.set(row.key, value);
                    } catch (e) {
                        logger.error({ err: e.message, key: row.key, context: "getMany parse" });
                    }
                }
            } catch (e) {
                logger.error({ err: e.message, context: "getMany" });
            }
        }

        return result;
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
                
                this.db.pragma("wal_checkpoint(PASSIVE)");
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
            this.db.pragma("incremental_vacuum");
            this.db.pragma("optimize");
            
            this.stmtGet?.finalize();
            this.stmtDel?.finalize();
            this.stmtSet?.finalize();
            this.stmtGetMany?.finalize();
            
            this.db.close();
            this.cache.clear();
            
            logger.info({ context: "_cleanup: database closed successfully" });
        } catch (e) {
            logger.error({ err: e.message, context: "_cleanup" });
        }
    }

    integrityCheck() {
        try {
            const result = this.db.pragma("integrity_check");
            return result[0].integrity_check === "ok";
        } catch (e) {
            logger.error({ err: e.message, context: "integrityCheck" });
            return false;
        }
    }

    getStats() {
        try {
            return {
                pageCount: this.db.pragma("page_count", { simple: true }),
                pageSize: this.db.pragma("page_size", { simple: true }),
                cacheSize: this.db.pragma("cache_size", { simple: true }),
                walMode: this.db.pragma("journal_mode", { simple: true }),
                cacheHits: this.cache.size,
            };
        } catch (e) {
            logger.error({ err: e.message, context: "getStats" });
            return null;
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