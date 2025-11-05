/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { Mutex } from "async-mutex";
import core from "./database-core.js";
import {
    logger,
    makeKey,
    parse,
} from "./database-config.js";

class TransactionManager {
    constructor() {
        this.transactionsInProgress = 0;
        this.txnCache = null;
        this.txnMutations = null;
        this.typeMutex = new Map();
        this.mutexCleanupThreshold = 100;
        this.mutexCleanupCount = 50;
    }
    isInTransaction() { return this.transactionsInProgress > 0; }
    getTypeMutex(type) {
        let m = this.typeMutex.get(type);
        if (!m) {
            m = new Mutex();
            this.typeMutex.set(type, m);
            if (this.typeMutex.size > this.mutexCleanupThreshold) {
                this._cleanupMutexes();
            }
        }
        return m;
    }
    _cleanupMutexes() {
        const toDelete = [];
        for (const [key, mutex] of this.typeMutex.entries()) {
            if (!mutex.isLocked()) {
                toDelete.push(key);
                if (toDelete.length >= this.mutexCleanupCount) break;
            }
        }
        for (const key of toDelete) {
            this.typeMutex.delete(key);
        }
    }
}

export function SQLiteKeyStore(_dbPath, _options) {
    const txnManager = new TransactionManager();

    async function _getMany(type, ids) {
        const out = {};
        const missing = [];

        for (const id of ids) {
            const k = makeKey(type, id);
            let v = core.cache.get(k);
            
            if (v !== undefined) {
                if (v !== null) out[id] = v;
            } else {
                missing.push({ id, k });
            }
        }

        if (missing.length > 0) {
            for (const { id, k } of missing) {
                const row = core.get(k);
                const v = row ? parse(row.value) : null;
                
                core.cache.set(k, v);
                if (v !== null) {
                    out[id] = v;
                }
            }
        }
        return out;
    }

    async function get(type, ids) {
        if (txnManager.isInTransaction() && txnManager.txnCache) {
            const out = {};
            const missing = [];
            const bucket = (txnManager.txnCache[type] ||= Object.create(null));
            
            for (const id of ids) {
                if (Object.prototype.hasOwnProperty.call(bucket, id)) {
                    const v = bucket[id];
                    if (v !== null && v !== undefined) out[id] = v;
                } else {
                    missing.push(id);
                }
            }
            
            if (missing.length) {
                const loaded = await _getMany(type, missing);
                for (const id of missing) {
                    bucket[id] = loaded[id] ?? null;
                    if (loaded[id] !== null && loaded[id] !== undefined) {
                        out[id] = loaded[id];
                    }
                }
            }
            return out;
        }
        return _getMany(type, ids);
    }

    async function set(data) {
        if (txnManager.isInTransaction() && txnManager.txnCache &&
            txnManager.txnMutations) {
            for (const type in data) {
                const bucket = data[type] || {};
                const txBucket = (txnManager.txnCache[type] ||= Object.create(null));
                const muBucket = (txnManager.txnMutations[type] ||= Object.create(null));
                for (const id in bucket) {
                    const v = bucket[id];
                    const normalized = v === undefined ? null : v;
                    txBucket[id] = normalized;
                    muBucket[id] = normalized;
                }
            }
            return;
        }
        
        for (const type in data) {
            const bucket = data[type] || {};
            for (const id in bucket) {
                const v = bucket[id];
                const k = makeKey(type, id);
                if (v === null || v === undefined) {
                    core.cache.del(k);
                    core.del(k);
                } else {
                    core.cache.set(k, v);
                    core.set(k, v);
                }
            }
        }
    }

    async function transaction(work, key = "default") {
        const txKeyMutex = txnManager.getTypeMutex(`__txn__:${key}`);
        return await txKeyMutex.runExclusive(async () => {
            const isOutermost = txnManager.transactionsInProgress === 0;
            txnManager.transactionsInProgress += 1;
            
            let savedCache = null;
            let savedMutations = null;
            
            if (!isOutermost) {
                savedCache = txnManager.txnCache ? 
                    core.deepClone(txnManager.txnCache) : null;
                savedMutations = txnManager.txnMutations ? 
                    core.deepClone(txnManager.txnMutations) : null;
            } else {
                txnManager.txnCache = Object.create(null);
                txnManager.txnMutations = Object.create(null);
            }
            
            try {
                const result = await work();
                
                if (isOutermost) {
                    const mutations = txnManager.txnMutations;
                    for (const type in mutations) {
                        const bucket = mutations[type];
                        for (const id in bucket) {
                            const k = makeKey(type, id);
                            const v = bucket[id];
                            if (v === null || v === undefined) {
                                core.cache.del(k);
                                core.del(k);
                            } else {
                                core.cache.set(k, v);
                                core.set(k, v);
                            }
                        }
                    }
                }
                
                return result;
            } catch (e) {
                logger.error(e.message);
                if (!isOutermost && savedCache !== null && savedMutations !== null) {
                    txnManager.txnCache = savedCache;
                    txnManager.txnMutations = savedMutations;
                }
                throw e;
            } finally {
                txnManager.transactionsInProgress -= 1;
                if (isOutermost) {
                    txnManager.txnCache = null;
                    txnManager.txnMutations = null;
                }
            }
        });
    }

    async function clear() {
        core.cache.flushAll();
        
        await core.dbQueue.add(() => {
            try {
                core.db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            } catch (e) {
                logger.error(e.message);
                throw e;
            }
        });
    }
    
    return {
        get,
        set,
        clear,
        transaction,
        isInTransaction: () => txnManager.isInTransaction(),
        _flushNow: () => core.flush(),
        _dispose: async () => {},
    };
}

