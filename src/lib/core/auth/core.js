/**
 * @file Baileys authentication database with caching and write buffering
 * @module database/auth
 * @description SQLite-based storage system for Baileys session management
 * with memory caching, write buffering, and automatic vacuuming.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { Database } from "bun:sqlite";
import { Mutex } from "async-mutex";
import { BufferJSON } from "baileys";
import {
    DEFAULT_DB,
    validateKey,
    validateValue,
    initializeSignalHandlers,
    registerSignalHandler,
} from "./config.js";

class LRUCache {
    constructor(maxSize = 10000) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    delete(key) {
        return this.cache.delete(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }
}

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
        this.cache = new LRUCache(options.cacheSize || 10000);

        try {
            this.db = this._initDatabase();
            this._prepareStatements();
            this._initWriteBuffer(options);
            this._initVacuum(options);
            this._registerCleanup();
            this.isInitialized = true;
        } catch (e) {
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
                    value TEXT NOT NULL,
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
                            const jsonString = JSON.stringify(v, BufferJSON.replacer);
                            this.stmtSet.run(k, jsonString);
                        } catch {
                            // Silent fail
                        }
                    }
                }

                for (let i = 0; i < deletesArr.length; i += maxBatch) {
                    const slice = deletesArr.slice(i, i + maxBatch);
                    for (const k of slice) {
                        try {
                            this.stmtDel.run(k);
                        } catch {
                            // Silent fail
                        }
                    }
                }
            });
        } catch (e) {
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
                // Silent fail, reschedule
                this._scheduleVacuum();
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
                let totalDeleted = 0;
                let hasMore = true;

                while (hasMore) {
                    const oldKeys = this.stmtGetOldKeys.all(cutoffTime, this.vacuumBatchSize);

                    if (oldKeys.length === 0) {
                        hasMore = false;
                        break;
                    }

                    const deleted = this.db.transaction(() => {
                        let count = 0;
                        for (const row of oldKeys) {
                            try {
                                this.stmtDel.run(row.key);
                                this.cache.delete(row.key);
                                count++;
                            } catch {
                                // Silent fail
                            }
                        }
                        return count;
                    })();

                    totalDeleted += deleted;

                    await new Promise((resolve) => setImmediate(resolve));
                }

                if (totalDeleted > 0) {
                    this.db.exec("PRAGMA incremental_vacuum");
                    this.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
                }

                this.lastVacuumTime = now;
                this._scheduleVacuum();
            } catch {
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
            if (typeof row.value === "string") {
                value = JSON.parse(row.value, BufferJSON.reviver);
            } else {
                this.del(key);
                return undefined;
            }

            this.cache.set(key, value);

            setImmediate(() => {
                try {
                    this.stmtUpdateAccess.run(key);
                } catch {
                    // Silent fail
                }
            });

            return { value };
        } catch {
            return undefined;
        }
    }

    set(key, value) {
        if (!validateKey(key) || !validateValue(value)) {
            return false;
        }

        this.cache.set(key, value);
        this.writeBuffer.addUpsert(key, value);
        this._scheduleFlush();
        return true;
    }

    del(key) {
        if (!validateKey(key)) {
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
                    // Silent fail
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
        } catch {
            // Silent fail
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