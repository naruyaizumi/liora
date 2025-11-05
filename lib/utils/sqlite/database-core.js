import Database from "better-sqlite3";
import { Mutex } from "async-mutex";
import NodeCache from "@cacheable/node-cache";
import PQueue from "p-queue";
import {
    DEFAULT_DB,
    logger,
    stringify,
    parse,
} from "./database-config.js";
import { 
    initializeSignalHandlers,
    registerSignalHandler
} from "./signal-handler.js";

const CLONE_FAILED = Symbol("CLONE_FAILED");

class WriteBuffer {
    constructor() {
        this.upserts = new Map();
        this.deletes = new Set();
    }
    addUpsert(k, v) { this.upserts.set(k, v); this.deletes.delete(k); }
    addDelete(k) { this.deletes.add(k); this.upserts.delete(k); }
    clear() { this.upserts.clear(); this.deletes.clear(); }
    hasChanges() { return this.upserts.size > 0 || this.deletes.size > 0; }
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
        this.instanceId = `DatabaseCore-${Date.now()}`;
        
        this.db = this._initDatabase();
        this.stmtGet = this.db.prepare("SELECT value FROM baileys_state WHERE key = ?");
        this.stmtSet = this.db.prepare("INSERT OR REPLACE INTO baileys_state (key, value) VALUES (?, ?)");
        this.stmtDel = this.db.prepare("DELETE FROM baileys_state WHERE key = ?");
        
        const cacheMax = Number(options.cacheMax ?? 5000);
        const ttlSeconds = Number(options.ttlMs ?? 5 * 60 * 1000) / 1000;
        this.cache = new NodeCache({
            max: cacheMax,
            stdTTL: ttlSeconds,
            useClones: false,
            deleteOnExpire: true,
        });
        
        this.dbQueue = new PQueue({ concurrency: 1 });
        this.writeBuffer = new WriteBuffer();
        this.writeMutex = new Mutex();
        this.flushIntervalMs = Number(options.flushIntervalMs ?? 200);
        this.maxBatch = Number(options.maxBatch ?? 1000);
        this.flushTimer = null;
        this.disposed = false;
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

        initializeSignalHandlers();
        registerSignalHandler(this.instanceId, this._cleanup.bind(this));
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
            logger.fatal(e.message);
            process.exit(1);
        }
    }

    get(key) {
        try {
            return this.stmtGet.get(key);
        } catch (e) {
            logger.error(e.message);
            return undefined;
        }
    }

    set(key, value) {
        this.writeBuffer.addUpsert(key, value);
        this._scheduleFlush();
    }
    
    del(key) {
        this.writeBuffer.addDelete(key);
        this._scheduleFlush();
    }

    _scheduleFlush() {
        if (!this.flushTimer && !this.disposed) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = null;
                this.flush();
            }, this.flushIntervalMs);
        }
    }

    async flush() {
        if (this.disposed) return;
        
        await this.writeMutex.runExclusive(async () => {
            if (!this.writeBuffer.hasChanges()) return;
            
            const { upserts, deletes } = this.writeBuffer.toArrays();
            this.writeBuffer.clear();
            
            await this.dbQueue.add(() => {
                try {
                    this.txCommit(upserts, deletes);
                    this.db.pragma("wal_checkpoint(PASSIVE)");
                } catch (e) {
                    logger.error(e.message);
                }
            });
        });
    }
    
    deepClone(obj) {
        if (obj === null || obj === undefined) return obj;
        try {
            const serialized = stringify(obj);
            const result = parse(serialized);
            if (result === null && obj !== null) return CLONE_FAILED;
            return result;
        } catch (e) {
            logger.error(e.message);
            return CLONE_FAILED;
        }
    }

    _cleanup() {
        if (this.disposed) return;
        this.disposed = true;
        
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        
        this.dbQueue.onIdle().then(() => {
            const { upserts, deletes } = this.writeBuffer.toArrays();
            if (upserts.length || deletes.length) {
                this.txCommit(upserts, deletes);
            }
            
            try {
                this.db.pragma("wal_checkpoint(TRUNCATE)");
                this.db.pragma("optimize");
                this.db.close();
            } catch (e) {
                logger.error(e.message);
            }
        });
    }
}

const core = new DatabaseCore(DEFAULT_DB);
export default core;
