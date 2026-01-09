/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { Database } from "bun:sqlite";
import { Mutex } from "async-mutex";
import { encode, decode } from "@msgpack/msgpack";
import {
    DEFAULT_DB,
    validateKey,
    validateValue,
    initializeSignalHandlers,
    registerSignalHandler,
} from "./config.js";

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
            this._initVacuum(options);
            this._registerCleanup();
            this.isInitialized = true;
        } catch (e) {
            global.logger.fatal({
                err: e.message,
                context: "AuthDatabase constructor",
            });
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
                    value BLOB NOT NULL,
                    last_access INTEGER DEFAULT (unixepoch())
                ) WITHOUT ROWID;
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_key_prefix ON baileys_state(key) 
                WHERE key LIKE '%-%';
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_last_access ON baileys_state(last_access);
            `);

            return db;
        } catch (e) {
            global.logger.fatal({
                err: e.message,
                context: "_initDatabase",
            });
            throw e;
        }
    }

    _prepareStatements() {
        try {
            this.stmtGet = this.db.query("SELECT value FROM baileys_state WHERE key = ?");

            this.stmtSet = this.db.query(
                "INSERT OR REPLACE INTO baileys_state (key, value, last_access) VALUES (?, ?, unixepoch())"
            );

            this.stmtDel = this.db.query("DELETE FROM baileys_state WHERE key = ?");

            this.stmtUpdateAccess = this.db.query(
                "UPDATE baileys_state SET last_access = unixepoch() WHERE key = ?"
            );

            this.stmtGetOldKeys = this.db.query(
                "SELECT key FROM baileys_state WHERE last_access < ? AND key LIKE '%-%' LIMIT ?"
            );

            this.stmtCountKeys = this.db.query(
                "SELECT COUNT(*) as count FROM baileys_state WHERE key LIKE '%-%'"
            );

            this.txCommit = this.db.transaction((upsertsArr, deletesArr) => {
                const maxBatch = this.maxBatch;

                for (let i = 0; i < upsertsArr.length; i += maxBatch) {
                    const slice = upsertsArr.slice(i, i + maxBatch);
                    for (const [k, v] of slice) {
                        try {
                            const binaryData = encode(v);
                            this.stmtSet.run(k, binaryData);
                        } catch (e) {
                            global.logger.error({
                                err: e.message,
                                key: k,
                                context: "txCommit upsert",
                            });
                        }
                    }
                }

                for (let i = 0; i < deletesArr.length; i += maxBatch) {
                    const slice = deletesArr.slice(i, i + maxBatch);
                    for (const k of slice) {
                        try {
                            this.stmtDel.run(k);
                        } catch (e) {
                            global.logger.error({
                                err: e.message,
                                key: k,
                                context: "txCommit delete",
                            });
                        }
                    }
                }
            });
        } catch (e) {
            global.logger.fatal({
                err: e.message,
                context: "_prepareStatements",
            });
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

    _initVacuum(options) {
        this.vacuumEnabled = options.vacuumEnabled !== false;
        this.vacuumIntervalMs = Number(options.vacuumIntervalMs ?? 3600000);
        this.vacuumMaxAge = Number(options.vacuumMaxAge ?? 604800);
        this.vacuumBatchSize = Number(options.vacuumBatchSize ?? 500);
        this.vacuumTimer = null;
        this.lastVacuumTime = 0;

        if (this.vacuumEnabled) {
            this._scheduleVacuum();
        }
    }

    _scheduleVacuum() {
        if (!this.vacuumEnabled || this.disposed || !this.isInitialized) return;

        if (this.vacuumTimer) {
            clearTimeout(this.vacuumTimer);
        }

        this.vacuumTimer = setTimeout(() => {
            this.vacuumTimer = null;
            this._performVacuum().catch((e) => {
                global.logger.error({
                    err: e.message,
                    context: "_scheduleVacuum",
                });
            });
        }, this.vacuumIntervalMs);

        this.vacuumTimer.unref?.();
    }

    async _performVacuum() {
        if (this.disposed || !this.isInitialized) return;

        const now = Date.now();
        if (now - this.lastVacuumTime < this.vacuumIntervalMs) {
            this._scheduleVacuum();
            return;
        }

        await this.writeMutex.runExclusive(async () => {
            try {
                const cutoffTime = Math.floor(Date.now() / 1000) - this.vacuumMaxAge;

                const countResult = this.stmtCountKeys.get();
                const totalKeys = countResult?.count || 0;

                if (totalKeys === 0) {
                    global.logger.debug("No keys to vacuum");
                    this.lastVacuumTime = now;
                    this._scheduleVacuum();
                    return;
                }

                const oldKeys = this.stmtGetOldKeys.all(cutoffTime, this.vacuumBatchSize);

                if (oldKeys.length === 0) {
                    global.logger.debug("No old keys found for vacuum");
                    this.lastVacuumTime = now;
                    this._scheduleVacuum();
                    return;
                }

                let deletedCount = 0;
                this.db.transaction(() => {
                    for (const row of oldKeys) {
                        try {
                            this.stmtDel.run(row.key);
                            this.cache.delete(row.key);
                            deletedCount++;
                        } catch (e) {
                            global.logger.error({
                                err: e.message,
                                key: row.key,
                                context: "_performVacuum delete",
                            });
                        }
                    }
                })();

                if (deletedCount > 0) {
                    this.db.exec("PRAGMA incremental_vacuum");
                    this.db.exec("PRAGMA wal_checkpoint(PASSIVE)");

                    global.logger.info({
                        deletedCount,
                        totalKeys,
                        context: "vacuum completed",
                    });
                }

                this.lastVacuumTime = now;
                this._scheduleVacuum();
            } catch (e) {
                global.logger.error({
                    err: e.message,
                    context: "_performVacuum",
                });
                this._scheduleVacuum();
            }
        });
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

            let value;
            if (row.value instanceof Uint8Array) {
                value = decode(row.value);
            } else {
                global.logger.warn({
                    key,
                    valueType: typeof row.value,
                    context: "get: unknown data type, deleting",
                });
                this.del(key);
                return undefined;
            }

            this.cache.set(key, value);

            setImmediate(() => {
                try {
                    this.stmtUpdateAccess.run(key);
                } catch (e) {
                    global.logger.debug({
                        err: e.message,
                        key,
                        context: "get: update access time",
                    });
                }
            });

            return { value };
        } catch (e) {
            global.logger.error({ err: e.message, key, context: "get" });
            return undefined;
        }
    }

    set(key, value) {
        if (!validateKey(key) || !validateValue(value)) {
            global.logger.warn({
                key,
                context: "set: invalid key or value",
            });
            return false;
        }

        this.cache.set(key, value);
        this.writeBuffer.addUpsert(key, value);
        this._scheduleFlush();
        return true;
    }

    del(key) {
        if (!validateKey(key)) {
            global.logger.warn({ key, context: "del: invalid key" });
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
                    global.logger.error({
                        err: e.message,
                        context: "_scheduleFlush",
                    });
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
                global.logger.error({
                    err: e.message,
                    context: "flush",
                });

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

    async forceVacuum() {
        if (!this.vacuumEnabled) {
            global.logger.warn("Vacuum is disabled");
            return;
        }

        this.lastVacuumTime = 0;
        await this._performVacuum();
    }

    _cleanup() {
        if (this.disposed) return;
        this.disposed = true;

        try {
            if (this.flushTimer) {
                clearTimeout(this.flushTimer);
                this.flushTimer = null;
            }

            if (this.vacuumTimer) {
                clearTimeout(this.vacuumTimer);
                this.vacuumTimer = null;
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
            this.stmtUpdateAccess?.finalize();
            this.stmtGetOldKeys?.finalize();
            this.stmtCountKeys?.finalize();
            this.db.close();
            this.cache.clear();
        } catch (e) {
            global.logger.error({ err: e.message, context: "_cleanup" });
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
