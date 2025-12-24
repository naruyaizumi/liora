/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";
import { Mutex } from "async-mutex";
import core, { parse, makeKey } from "./core.js";

const MAX_TRANSACTION_CACHE_SIZE = 10000;

class TransactionManager {
    constructor() {
        this.transactionsInProgress = 0;
        this.txnCache = null;
        this.txnMutations = null;
        this.typeMutex = new Map();
        this.mutexCleanupThreshold = 100;
        this.mutexCleanupCount = 50;
        this.mutexCleanupTimer = null;
        this.lastMutexCleanup = Date.now();
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
                this._scheduleCleanupMutexes();
            }
        }
        return m;
    }

    _scheduleCleanupMutexes() {
        const now = Date.now();
        if (now - this.lastMutexCleanup < 5000) return;
        
        if (this.mutexCleanupTimer) return;

        this.mutexCleanupTimer = setTimeout(() => {
            this.mutexCleanupTimer = null;
            this._cleanupMutexes();
            this.lastMutexCleanup = Date.now();
        }, 100);
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

    forceCleanupMutexes() {
        const toDelete = [];
        for (const [key, mutex] of this.typeMutex.entries()) {
            if (!mutex.isLocked()) {
                toDelete.push(key);
            }
        }
        for (const key of toDelete) {
            this.typeMutex.delete(key);
        }
    }

    _checkCacheSize() {
        if (!this.txnCache) return false;
        
        let totalSize = 0;
        for (const type in this.txnCache) {
            totalSize += Object.keys(this.txnCache[type]).length;
        }
        
        if (totalSize > MAX_TRANSACTION_CACHE_SIZE) {
            global.logger.warn(`Transaction cache size exceeded: ${totalSize}`);
            return true;
        }
        return false;
    }

    clearTransactionData() {
        if (this.txnCache) {
            for (const type in this.txnCache) {
                delete this.txnCache[type];
            }
            this.txnCache = null;
        }
        
        if (this.txnMutations) {
            for (const type in this.txnMutations) {
                delete this.txnMutations[type];
            }
            this.txnMutations = null;
        }
    }

    dispose() {
        if (this.mutexCleanupTimer) {
            clearTimeout(this.mutexCleanupTimer);
            this.mutexCleanupTimer = null;
        }
        this.forceCleanupMutexes();
        this.clearTransactionData();
    }
}

function createKeyStore() {
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
            
            txnManager._checkCacheSize();
            return out;
        }
        return _getMany(type, ids);
    }

    async function set(data) {
        if (txnManager.isInTransaction() && txnManager.txnCache && txnManager.txnMutations) {
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
            
            txnManager._checkCacheSize();
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
                const clonedCache = core.deepClone(txnManager.txnCache);
                const clonedMutations = core.deepClone(txnManager.txnMutations);
                
                if (clonedCache !== null && typeof clonedCache === 'object') {
                    savedCache = clonedCache;
                }
                if (clonedMutations !== null && typeof clonedMutations === 'object') {
                    savedMutations = clonedMutations;
                }
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
                global.logger.error(`Transaction error: ${e.message}`);
                
                if (!isOutermost && savedCache !== null && savedMutations !== null) {
                    txnManager.txnCache = savedCache;
                    txnManager.txnMutations = savedMutations;
                }
                throw e;
            } finally {
                txnManager.transactionsInProgress -= 1;
                
                if (isOutermost) {
                    txnManager.clearTransactionData();
                }
                
                if (txnManager.transactionsInProgress === 0) {
                    txnManager._scheduleCleanupMutexes();
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
                global.logger.error(e.message);
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
        _dispose: async () => {
            await core.flush();
            txnManager.dispose();
        }
    };
}

export function useSQLiteAuthState(_dbPath, _options) {
    let creds;
    try {
        const row = core.get("creds");
        if (row && row.value) {
            creds = parse(row.value) || initAuthCreds();
        } else {
            creds = initAuthCreds();
        }
    } catch (e) {
        global.logger.error(e.message);
        creds = initAuthCreds();
    }

    const keyStore = createKeyStore();

    const keys = {
        async get(type, ids) {
            return keyStore.get(type, ids);
        },

        async set(data) {
            return keyStore.set(data);
        },

        async clear() {
            return keyStore.clear();
        }
    };

    function saveCreds() {
        if (core.isHealthy()) {
            core.set("creds", creds);
        }
    }

    async function dispose() {
        try {
            await keyStore._dispose();
            await core.dispose();
        } catch (e) {
            global.logger.error(`Auth dispose error: ${e.message}`);
        }
    }

    return {
        state: { creds, keys },
        saveCreds,
        dispose,
        db: core.db,
        get closed() {
            return core.disposed;
        },
    };
}