/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";
import { Mutex } from "async-mutex";
import db from "./database-core.js";
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

export function SQLiteAuth(_dbPath, _options) {
    let creds;

    try {
        const row = db.get("creds");
        if (row?.value) {
            creds = row.value;
            if (!creds || typeof creds !== "object") {
                logger.warn({ context: "SQLiteAuth: invalid creds, reinitializing" });
                creds = initAuthCreds();
            }
        } else {
            creds = initAuthCreds();
        }
    } catch (e) {
        logger.error({ err: e.message, context: "SQLiteAuth init" });
        creds = initAuthCreds();
    }

    const txnManager = new TransactionManager();

    async function _getMany(type, ids) {
        const out = {};

        for (const id of ids) {
            const k = makeKey(type, id);
            if (!validateKey(k)) continue;

            try {
                const row = db.get(k);
                const v = row?.value ?? null;

                if (v !== null) {
                    out[id] = v;
                }
            } catch (e) {
                logger.error({ err: e.message, key: k, context: "_getMany" });
            }
        }

        return out;
    }

    async function keysGet(type, ids) {
        if (!type || !Array.isArray(ids)) {
            logger.warn({ type, ids, context: "keys.get: invalid params" });
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
                    logger.error({ err: e.message, type, context: "keys.get transaction" });
                }
            }

            return out;
        }

        return _getMany(type, ids);
    }

    async function keysSet(data) {
        if (!data || typeof data !== "object") {
            logger.warn({ context: "keys.set: invalid data" });
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
                            logger.warn({ type, id, context: "keys.set: invalid value" });
                            continue;
                        }

                        const normalized = v === undefined ? null : v;
                        txBucket[id] = normalized;
                        muBucket[id] = normalized;
                    } catch (e) {
                        logger.error({ err: e.message, type, id, context: "keys.set transaction" });
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
                        logger.warn({ key: k, context: "keys.set: invalid key" });
                        continue;
                    }

                    if (!validateValue(v)) {
                        logger.warn({ key: k, context: "keys.set: invalid value" });
                        continue;
                    }

                    if (v === null || v === undefined) {
                        db.del(k);
                    } else {
                        db.set(k, v);
                    }
                } catch (e) {
                    logger.error({ err: e.message, type, id, context: "keys.set" });
                }
            }
        }
    }

    async function keysClear() {
        try {
            logger.info({ context: "keys.clear: clearing all keys" });
            db.db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            db.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
            db.cache.clear();
        } catch (e) {
            logger.error({ err: e.message, context: "keys.clear" });
        }
    }

    async function transaction(work, key = "default") {
        if (typeof work !== "function") {
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
                    savedCache = txnManager.txnCache ? db.deepClone(txnManager.txnCache) : null;
                    savedMutations = txnManager.txnMutations
                        ? db.deepClone(txnManager.txnMutations)
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
                                    logger.warn({
                                        key: k,
                                        context: "transaction commit: invalid key",
                                    });
                                    continue;
                                }

                                if (v === null || v === undefined) {
                                    db.del(k);
                                } else {
                                    db.set(k, v);
                                }
                            } catch (e) {
                                logger.error({
                                    err: e.message,
                                    type,
                                    id,
                                    context: "transaction commit",
                                });
                            }
                        }
                    }
                }

                return result;
            } catch (e) {
                logger.error({ err: e.message, context: "transaction" });

                // Rollback nested transaction
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

    function saveCreds() {
        try {
            if (!creds || typeof creds !== "object") {
                logger.error({ context: "saveCreds: invalid creds" });
                return false;
            }

            db.set("creds", creds);
            return true;
        } catch (e) {
            logger.error({ err: e.message, context: "saveCreds" });
            return false;
        }
    }

    const keys = {
        get: keysGet,
        set: keysSet,
        clear: keysClear,
    };

    return {
        state: { creds, keys },
        saveCreds,
        transaction,
        isInTransaction: () => txnManager.isInTransaction(),
        _flushNow: async () => {
            try {
                await db.flush();
            } catch (e) {
                logger.error({ err: e.message, context: "_flushNow" });
            }
        },
        _dispose: async () => {
            try {
                txnManager.dispose();
                await db.flush();
            } catch (e) {
                logger.error({ err: e.message, context: "_dispose" });
            }
        },
        db: db.db,
        get closed() {
            return db.disposed;
        },
    };
}