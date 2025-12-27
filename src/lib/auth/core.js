/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { BufferJSON } from "baileys";
import { Mutex } from "async-mutex";

const DEFAULT_DB = path.join(process.cwd(), "src", "database", "auth.db");

const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);

export const parse = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str, BufferJSON.reviver);
    } catch (e) {
        global.logger?.error(e.message);
        return null;
    }
};

export const makeKey = (type, id) => `${type}-${id}`;

const CLONE_FAILED = Symbol("CLONE_FAILED");
const MAX_CLONE_DEPTH = 50;

class LRUCache {
    constructor(maxSize = 5000) {
        this.maxSize = maxSize;
        this.cache = new Map();
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

    del(key) {
        this.cache.delete(key);
    }

    flushAll() {
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
        this.stmtCount = this.db.prepare("SELECT COUNT(*) as count FROM baileys_state");
        this.stmtDeleteOldSessions = this.db.prepare(`
            DELETE FROM baileys_state 
            WHERE key LIKE 'pre-key-%' 
            OR key LIKE 'sender-key-%' 
            OR key LIKE 'session-%'
            OR key LIKE 'app-state-sync-version-%'
        `);

        const cacheMax = Number(options.cacheMax ?? 5000);
        this.cache = new LRUCache(cacheMax);

        this.writeBuffer = new WriteBuffer();
        this.writeMutex = new Mutex();
        this.flushIntervalMs = Number(options.flushIntervalMs ?? 200);
        this.maxBatch = Number(options.maxBatch ?? 500);
        this.flushTimer = null;
        this.disposed = false;
        this.isCleaningUp = false;
        this.pendingFlush = null;

        this.autoCleanupEnabled = options.autoCleanup !== false;
        this.cleanupIntervalMs = Number(options.cleanupIntervalMs ?? 30 * 60 * 1000);
        this.maxDbSize = Number(options.maxDbSize ?? 100 * 1024 * 1024);
        this.cleanupTimer = null;
        this.lastCleanup = Date.now();
        this.lastVacuum = Date.now();
        this.vacuumIntervalMs = 24 * 60 * 60 * 1000;
        
        if (this.autoCleanupEnabled) {
            this._scheduleCleanup();
        }
    }

    _initDatabase() {
        try {
            const db = new DatabaseSync(this.dbPath, { open: true });

            db.exec("PRAGMA journal_mode = WAL");
            db.exec("PRAGMA synchronous = NORMAL");
            db.exec("PRAGMA temp_store = MEMORY");
            db.exec("PRAGMA cache_size = -65536");
            db.exec("PRAGMA mmap_size = 268435456");
            db.exec("PRAGMA page_size = 4096");
            db.exec("PRAGMA auto_vacuum = INCREMENTAL");
            db.exec("PRAGMA busy_timeout = 5000");
            db.exec("PRAGMA wal_autocheckpoint = 1000");
            db.exec(`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key   TEXT PRIMARY KEY NOT NULL,
                    value TEXT NOT NULL
                ) WITHOUT ROWID;
            `);
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_baileys_key_prefix 
                ON baileys_state(key) WHERE key LIKE '%-%';
            `);

            return db;
        } catch (e) {
            global.logger?.fatal(e.message);
            throw e;
        }
    }

    get(key) {
        if (this.disposed) return undefined;
        try {
            const row = this.stmtGet.get(key);
            return row || undefined;
        } catch (e) {
            global.logger?.error(`Get error: ${e.message}`);
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
                        global.logger?.error(`Flush error: ${err.message}`);
                    }
                });
            }, this.flushIntervalMs);
        }
    }

    async flush() {
        if (this.disposed || this.isCleaningUp) return;

        if (this.pendingFlush) {
            return this.pendingFlush;
        }

        this.pendingFlush = this.writeMutex.runExclusive(async () => {
            try {
                if (!this.writeBuffer.hasChanges() || this.disposed) return;

                const { upserts, deletes } = this.writeBuffer.toArrays();
                this.writeBuffer.clear();

                if (this.disposed) return;

                const upsertBatches = [];
                for (let i = 0; i < upserts.length; i += this.maxBatch) {
                    upsertBatches.push(upserts.slice(i, i + this.maxBatch));
                }

                const deleteBatches = [];
                for (let i = 0; i < deletes.length; i += this.maxBatch) {
                    deleteBatches.push(deletes.slice(i, i + this.maxBatch));
                }

                for (const batch of upsertBatches) {
                    if (this.disposed) break;
                    this.db.exec("BEGIN IMMEDIATE");
                    try {
                        for (const [k, v] of batch) {
                            this.stmtSet.run(k, stringify(v));
                        }
                        this.db.exec("COMMIT");
                    } catch (e) {
                        this.db.exec("ROLLBACK");
                        throw e;
                    }
                }

                for (const batch of deleteBatches) {
                    if (this.disposed) break;
                    this.db.exec("BEGIN IMMEDIATE");
                    try {
                        for (const k of batch) {
                            this.stmtDel.run(k);
                        }
                        this.db.exec("COMMIT");
                    } catch (e) {
                        this.db.exec("ROLLBACK");
                        throw e;
                    }
                }

                if (!this.disposed) {
                    try {
                        this.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
                    } catch {
                        //
                    }
                }
            } catch (e) {
                if (!this.disposed) {
                    global.logger?.error(`Transaction error: ${e.message}`);
                }
                throw e;
            } finally {
                this.pendingFlush = null;
            }
        });

        return this.pendingFlush;
    }

    _scheduleCleanup() {
        if (this.cleanupTimer || this.disposed) return;

        this.cleanupTimer = setTimeout(() => {
            this.cleanupTimer = null;
            this._performCleanup().catch((e) => {
                if (!this.disposed) {
                    global.logger?.error(`Auto-cleanup error: ${e.message}`);
                }
            });
        }, this.cleanupIntervalMs);
    }

    async _performCleanup() {
        if (this.disposed || this.isCleaningUp) return;

        try {
            const dbSizeRow = this.db.prepare("PRAGMA page_count").get();
            const pageSizeRow = this.db.prepare("PRAGMA page_size").get();
            const dbSize = (dbSizeRow?.page_count || 0) * (pageSizeRow?.page_size || 4096);

            global.logger?.info(`Database size: ${(dbSize / 1024 / 1024).toFixed(2)} MB`);

            if (dbSize > this.maxDbSize) {
                await this.flush();

                this.db.exec("BEGIN IMMEDIATE");
                try {
                    const result = this.stmtDeleteOldSessions.run();
                    this.db.exec("COMMIT");

                    global.logger?.info(`Cleaned up ${result.changes || 0} old session entries`);

                    const keysToDelete = [];
                    for (const [key] of this.cache.cache.entries()) {
                        if (key.startsWith('pre-key-') || 
                            key.startsWith('sender-key-') || 
                            key.startsWith('session-') ||
                            key.startsWith('app-state-sync-version-')) {
                            keysToDelete.push(key);
                        }
                    }
                    for (const key of keysToDelete) {
                        this.cache.del(key);
                    }

                    this.db.exec("PRAGMA incremental_vacuum");
                    
                    global.logger?.info("Database cleanup completed");
                } catch (e) {
                    this.db.exec("ROLLBACK");
                    global.logger?.error(`Cleanup transaction error: ${e.message}`);
                }
            }

            const now = Date.now();
            if (now - this.lastVacuum > this.vacuumIntervalMs) {
                try {
                    global.logger?.info("Running full VACUUM...");
                    this.db.exec("VACUUM");
                    this.lastVacuum = now;
                    global.logger?.info("VACUUM completed");
                } catch (e) {
                    global.logger?.error(`VACUUM error: ${e.message}`);
                }
            }

            this.lastCleanup = Date.now();
            
            if (this.autoCleanupEnabled) {
                this._scheduleCleanup();
            }
        } catch (e) {
            global.logger?.error(`Cleanup error: ${e.message}`);
            
            if (this.autoCleanupEnabled) {
                this._scheduleCleanup();
            }
        }
    }

    async manualCleanup() {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        await this._performCleanup();
    }

    getDbStats() {
        try {
            const countRow = this.stmtCount.get();
            const pageSizeRow = this.db.prepare("PRAGMA page_size").get();
            const pageCountRow = this.db.prepare("PRAGMA page_count").get();
            const freeListRow = this.db.prepare("PRAGMA freelist_count").get();

            const totalEntries = countRow?.count || 0;
            const pageSize = pageSizeRow?.page_size || 4096;
            const pageCount = pageCountRow?.page_count || 0;
            const freePages = freeListRow?.freelist_count || 0;

            const dbSize = pageCount * pageSize;
            const usedSize = (pageCount - freePages) * pageSize;

            return {
                entries: totalEntries,
                dbSize: dbSize,
                usedSize: usedSize,
                freeSize: freePages * pageSize,
                cacheSize: this.cache.size,
                dbSizeMB: (dbSize / 1024 / 1024).toFixed(2),
                usedSizeMB: (usedSize / 1024 / 1024).toFixed(2),
            };
        } catch (e) {
            global.logger?.error(`Stats error: ${e.message}`);
            return null;
        }
    }

    deepClone(obj, depth = 0) {
        if (obj === null || obj === undefined) return obj;
        if (depth > MAX_CLONE_DEPTH) {
            global.logger?.warn("Max clone depth reached");
            return CLONE_FAILED;
        }

        try {
            const serialized = stringify(obj);
            const result = parse(serialized);
            if (result === null) return CLONE_FAILED;
            return result;
        } catch (e) {
            global.logger?.error(`Clone error: ${e.message}`);
            return CLONE_FAILED;
        }
    }

    async dispose() {
        if (this.disposed || this.isCleaningUp) return;

        this.isCleaningUp = true;

        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        try {
            if (this.pendingFlush) {
                await Promise.race([
                    this.pendingFlush,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Pending flush timeout")), 3000)
                    )
                ]).catch(() => {
                    global.logger?.warn("Pending flush timeout during dispose");
                });
            }

            const { upserts, deletes } = this.writeBuffer.toArrays();
            if (upserts.length || deletes.length) {
                this.db.exec("BEGIN IMMEDIATE");
                try {
                    for (const [k, v] of upserts) {
                        this.stmtSet.run(k, stringify(v));
                    }
                    for (const k of deletes) {
                        this.stmtDel.run(k);
                    }
                    this.db.exec("COMMIT");
                } catch (e) {
                    this.db.exec("ROLLBACK");
                    global.logger?.error(`Final flush error: ${e.message}`);
                }
            }
            this.writeBuffer.clear();

            this.cache.flushAll();

            if (this.db && !this.disposed) {
                try {
                    const stats = this.getDbStats();
                    if (stats) {
                        global.logger?.info(`Final DB stats: ${stats.entries} entries, ${stats.dbSizeMB} MB`);
                    }

                    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
                    this.db.exec("PRAGMA incremental_vacuum");
                    this.db.exec("PRAGMA optimize");
                } catch (e) {
                    global.logger?.error(`DB cleanup error: ${e.message}`);
                }

                this.db.close();
            }
        } catch (e) {
            global.logger?.error(`Dispose error: ${e.message}`);
        } finally {
            this.disposed = true;

            this.stmtGet = null;
            this.stmtSet = null;
            this.stmtDel = null;
            this.stmtCount = null;
            this.stmtDeleteOldSessions = null;
            this.db = null;
            this.cache = null;
            this.writeBuffer = null;
            this.pendingFlush = null;
        }
    }

    isHealthy() {
        return !this.disposed && !this.isCleaningUp && this.db !== null;
    }
}

const core = new DatabaseCore(DEFAULT_DB);
export default core;