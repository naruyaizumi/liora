/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { Mutex } from "async-mutex";
import core from "./database-core.js";
import { logger, makeKey, validateKey, validateValue } from "./database-config.js";

class TransactionManager {
    constructor() {
        this.transactionsInProgress = 0;
        this.txnCache = null;
        this.txnMutations = null;
        this.typeMutex = new Map();
        this.mutexCleanupThreshold = 100;
        this.mutexCleanupCount = 50;
        this.cleanupTimer = null;
    }

    isInTransaction() {
        return this.transactionsInProgress > 0;
    }

    getTypeMutex(type) {
        let m = this.typeMutex.get(type);
        if (!m) {
            m = new Mutex();
            this.typeMutex.set(type, m);
            
            if (this.typeMutex.size > this.mutexCleanupThreshold) {
                this._scheduleCleanup();
            }
        }
        return m;
    }

    _scheduleCleanup() {
        if (this.cleanupTimer) return;
        
        this.cleanupTimer = setTimeout(() => {
            this.cleanupTimer = null;
            this._cleanupMutexes();
        }, 1000);
        
        this.cleanupTimer.unref?.();
    }

    _cleanupMutexes() {
        try {
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
        } catch (e) {
            logger.error({ err: e.message, context: "_cleanupMutexes" });
        }
    }

    dispose() {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.typeMutex.clear();
        this.txnCache = null;
        this.txnMutations = null;
    }
}

export function SQLiteKeyStore(_dbPath, _options) {
    const txnManager = new TransactionManager();

    async function _getMany(type, ids) {
        const out = {};
        const missing = [];
        
        for (const id of ids) {
            const k = makeKey(type, id);
            if (!validateKey(k)) continue;

            let v = core.cache.get(k);

            if (v !== undefined) {
                if (v !== null) out[id] = v;
            } else {
                missing.push({ id, k });
            }
        }

        if (missing.length > 0) {
            for (const { id, k } of missing) {
                try {
                    const row = core.get(k);
                    const v = row?.value ?? null;

                    core.cache.set(k, v);
                    if (v !== null) {
                        out[id] = v;
                    }
                } catch (e) {
                    logger.error({ err: e.message, key: k, context: "_getMany" });
                }
            }
        }

        return out;
    }

    async function get(type, ids) {
        if (!type || !Array.isArray(ids)) {
            logger.warn({ type, ids, context: "get: invalid params" });
            return {};
        }

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
                try {
                    const loaded = await _getMany(type, missing);
                    for (const id of missing) {
                        bucket[id] = loaded[id] ?? null;
                        if (loaded[id] !== null && loaded[id] !== undefined) {
                            out[id] = loaded[id];
                        }
                    }
                } catch (e) {
                    logger.error({ err: e.message, type, context: "get transaction" });
                }
            }

            return out;
        }

        return _getMany(type, ids);
    }

    async function set(data) {
        if (!data || typeof data !== 'object') {
            logger.warn({ context: "set: invalid data" });
            return;
        }

        if (txnManager.isInTransaction() && txnManager.txnCache && txnManager.txnMutations) {
            for (const type in data) {
                const bucket = data[type] || {};
                const txBucket = (txnManager.txnCache[type] ||= Object.create(null));
                const muBucket = (txnManager.txnMutations[type] ||= Object.create(null));
                
                for (const id in bucket) {
                    try {
                        const v = bucket[id];
                        if (!validateValue(v)) {
                            logger.warn({ type, id, context: "set: invalid value" });
                            continue;
                        }
                        
                        const normalized = v === undefined ? null : v;
                        txBucket[id] = normalized;
                        muBucket[id] = normalized;
                    } catch (e) {
                        logger.error({ err: e.message, type, id, context: "set transaction" });
                    }
                }
            }
            return;
        }

        for (const type in data) {
            const bucket = data[type] || {};
            for (const id in bucket) {
                try {
                    const v = bucket[id];
                    const k = makeKey(type, id);
                    
                    if (!validateKey(k)) {
                        logger.warn({ key: k, context: "set: invalid key" });
                        continue;
                    }

                    if (!validateValue(v)) {
                        logger.warn({ key: k, context: "set: invalid value" });
                        continue;
                    }

                    if (v === null || v === undefined) {
                        core.cache.del(k);
                        core.del(k);
                    } else {
                        core.cache.set(k, v);
                        core.set(k, v);
                    }
                } catch (e) {
                    logger.error({ err: e.message, type, id, context: "set" });
                }
            }
        }
    }

    async function transaction(work, key = "default") {
        if (typeof work !== 'function') {
            logger.error({ context: "transaction: work must be a function" });
            throw new Error("Transaction work must be a function");
        }

        const txKeyMutex = txnManager.getTypeMutex(`__txn__:${key}`);
        
        return await txKeyMutex.runExclusive(async () => {
            const isOutermost = txnManager.transactionsInProgress === 0;
            txnManager.transactionsInProgress += 1;

            let savedCache = null;
            let savedMutations = null;

            try {
                if (!isOutermost) {
                    savedCache = txnManager.txnCache ? core.deepClone(txnManager.txnCache) : null;
                    savedMutations = txnManager.txnMutations 
                        ? core.deepClone(txnManager.txnMutations) 
                        : null;
                } else {
                    txnManager.txnCache = Object.create(null);
                    txnManager.txnMutations = Object.create(null);
                }

                const result = await work();

                if (isOutermost) {
                    const mutations = txnManager.txnMutations;
                    
                    for (const type in mutations) {
                        const bucket = mutations[type];
                        for (const id in bucket) {
                            try {
                                const k = makeKey(type, id);
                                const v = bucket[id];
                                
                                if (!validateKey(k)) {
                                    logger.warn({ key: k, context: "transaction commit: invalid key" });
                                    continue;
                                }

                                if (v === null || v === undefined) {
                                    core.cache.del(k);
                                    core.del(k);
                                } else {
                                    core.cache.set(k, v);
                                    core.set(k, v);
                                }
                            } catch (e) {
                                logger.error({ err: e.message, type, id, context: "transaction commit" });
                            }
                        }
                    }
                }

                return result;
            } catch (e) {
                logger.error({ err: e.message, context: "transaction" });
                
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
        try {
            core.cache.flushAll();

            await core.dbQueue.add(() => {
                try {
                    core.db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
                    core.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
                } catch (e) {
                    logger.error({ err: e.message, context: "clear" });
                    throw e;
                }
            });
        } catch (e) {
            logger.error({ err: e.message, context: "clear" });
            throw e;
        }
    }

    return {
        get,
        set,
        clear,
        transaction,
        isInTransaction: () => txnManager.isInTransaction(),
        _flushNow: async () => {
            try {
                await core.flush();
            } catch (e) {
                logger.error({ err: e.message, context: "_flushNow" });
            }
        },
        _dispose: async () => {
            try {
                txnManager.dispose();
                await core.flush();
            } catch (e) {
                logger.error({ err: e.message, context: "_dispose" });
            }
        },
    };
}