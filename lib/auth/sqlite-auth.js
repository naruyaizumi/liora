/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";
import { AsyncLocalStorage } from "async_hooks";
import { Mutex } from "async-mutex";
import PQueue from "p-queue";
import db from "./database-core.js";
import { logger, makeKey, validateKey, validateValue } from "./database-config.js";

const DEFAULT_TRANSACTION_OPTIONS = {
    maxCommitRetries: 5,
    delayBetweenTriesMs: 200,
    transactionMode: "IMMEDIATE", // DEFERRED, IMMEDIATE, or EXCLUSIVE
};

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SQLiteAuth(_dbPath, options = {}) {
    const txOptions = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

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

    const txStorage = new AsyncLocalStorage();
    const keyQueues = new Map();
    const txMutexes = new Map();
    
    const globalMutex = new Mutex();

    function getQueue(key) {
        if (!keyQueues.has(key)) {
            keyQueues.set(key, new PQueue({ concurrency: 1 }));
        }
        return keyQueues.get(key);
    }

    function getTxMutex(key) {
        if (!txMutexes.has(key)) {
            txMutexes.set(key, new Mutex());
        }
        return txMutexes.get(key);
    }

    function isInTransaction() {
        return !!txStorage.getStore();
    }

    async function commitWithRetry(mutations) {
        if (Object.keys(mutations).length === 0) {
            logger.trace("no mutations in transaction");
            return;
        }

        logger.trace("committing transaction");

        for (let attempt = 0; attempt < txOptions.maxCommitRetries; attempt++) {
            try {
                const commitTx = db.db.transaction(() => {
                    for (const type in mutations) {
                        const bucket = mutations[type];
                        for (const id in bucket) {
                            const k = makeKey(type, id);
                            const v = bucket[id];

                            if (!validateKey(k)) continue;

                            if (v === null || v === undefined) {
                                db.del(k);
                            } else {
                                db.set(k, v);
                            }
                        }
                    }
                });
                
                commitTx[txOptions.transactionMode.toLowerCase()]();

                logger.trace(
                    { mutationCount: Object.keys(mutations).length },
                    "committed transaction"
                );
                return;
            } catch (error) {
                const retriesLeft = txOptions.maxCommitRetries - attempt - 1;
                
                const isRetryable = 
                    error.code === "SQLITE_BUSY" ||
                    error.code === "SQLITE_LOCKED" ||
                    error.message?.includes("database is locked");
                
                if (!isRetryable) {
                    logger.error({ err: error.message, code: error.code, context: "commitWithRetry" });
                    throw error;
                }

                logger.warn({
                    err: error.message,
                    retriesLeft,
                    context: "commitWithRetry: database busy, retrying"
                });

                if (retriesLeft === 0) {
                    throw error;
                }

                await delay(txOptions.delayBetweenTriesMs * (attempt + 1));
            }
        }
    }

    async function keysGet(type, ids) {
        if (!type || !Array.isArray(ids)) {
            logger.warn({ type, ids, context: "keys.get: invalid params" });
            return {};
        }

        const ctx = txStorage.getStore();

        if (!ctx) {
            const result = {};
            const keys = ids.map(id => makeKey(type, id)).filter(validateKey);
            
            if (keys.length === 0) return result;

            try {
                const data = db.getMany(keys);
                
                for (const id of ids) {
                    const k = makeKey(type, id);
                    if (data[k]) {
                        result[id] = data[k];
                    }
                }

                return result;
            } catch (e) {
                logger.error({ err: e.message, type, context: "keys.get" });
                return result;
            }
        }

        const cached = ctx.cache[type] || {};
        const missing = ids.filter((id) => !(id in cached));

        if (missing.length > 0) {
            ctx.dbQueries++;
            logger.trace({ type, count: missing.length }, "fetching missing keys in transaction");

            const fetched = await getTxMutex(type).runExclusive(async () => {
                const result = {};
                const keys = missing.map(id => makeKey(type, id)).filter(validateKey);
                
                if (keys.length === 0) return result;

                try {
                    const data = db.getMany(keys);
                    
                    for (const id of missing) {
                        const k = makeKey(type, id);
                        if (data[k]) {
                            result[id] = data[k];
                        }
                    }

                    return result;
                } catch (e) {
                    logger.error({ err: e.message, type, context: "keys.get fetch" });
                    return result;
                }
            });

            ctx.cache[type] = ctx.cache[type] || {};
            Object.assign(ctx.cache[type], fetched);
        }

        const result = {};
        for (const id of ids) {
            const value = ctx.cache[type]?.[id];
            if (value !== undefined && value !== null) {
                result[id] = value;
            }
        }

        return result;
    }

    async function keysSet(data) {
        if (!data || typeof data !== "object") {
            logger.warn({ context: "keys.set: invalid data" });
            return;
        }

        const ctx = txStorage.getStore();

        if (!ctx) {
            const types = Object.keys(data);

            await Promise.all(
                types.map((type) =>
                    getQueue(type).add(async () => {
                        const bucket = data[type];

                        for (const id in bucket) {
                            try {
                                const k = makeKey(type, id);
                                const v = bucket[id];

                                if (!validateKey(k)) continue;
                                if (!validateValue(v)) continue;

                                if (v === null || v === undefined) {
                                    db.del(k);
                                } else {
                                    db.set(k, v);
                                }
                            } catch (e) {
                                logger.error({ err: e.message, type, id, context: "keys.set" });
                            }
                        }
                    })
                )
            );

            return;
        }

        logger.trace({ types: Object.keys(data) }, "caching in transaction");

        for (const type in data) {
            const bucket = data[type];

            ctx.cache[type] = ctx.cache[type] || {};
            ctx.mutations[type] = ctx.mutations[type] || {};

            Object.assign(ctx.cache[type], bucket);
            Object.assign(ctx.mutations[type], bucket);
        }
    }

    async function keysClear() {
        return globalMutex.runExclusive(async () => {
            try {
                logger.info({ context: "keys.clear: clearing all keys" });
                
                const clearTx = db.db.transaction(() => {
                    db.db.prepare("DELETE FROM baileys_state WHERE key LIKE '%-%'").run();
                });
                
                clearTx.immediate();
                
                db.db.pragma("wal_checkpoint(PASSIVE)");
                
                db.cache.clear();
                
                logger.info({ context: "keys.clear: completed" });
            } catch (e) {
                logger.error({ err: e.message, context: "keys.clear" });
                throw e;
            }
        });
    }

    async function transaction(work, key = "default") {
        if (typeof work !== "function") {
            logger.error({ context: "transaction: work must be a function" });
            throw new Error("Transaction work must be a function");
        }

        const existing = txStorage.getStore();

        if (existing) {
            logger.trace("reusing existing transaction context");
            return work();
        }

        return getTxMutex(key).runExclusive(async () => {
            const ctx = {
                cache: {},
                mutations: {},
                dbQueries: 0,
                startTime: Date.now(),
            };

            logger.trace({ key }, "entering transaction");

            let result;
            let error;

            try {
                result = await txStorage.run(ctx, work);
            } catch (err) {
                error = err;
            }

            if (error) {
                logger.error({ 
                    error: error.message,
                    duration: Date.now() - ctx.startTime,
                    context: "transaction failed, rolling back"
                });
                throw error;
            }

            try {
                await commitWithRetry(ctx.mutations);

                logger.trace({ 
                    dbQueries: ctx.dbQueries,
                    duration: Date.now() - ctx.startTime,
                    context: "transaction completed"
                });

                return result;
            } catch (commitError) {
                logger.error({
                    error: commitError.message,
                    duration: Date.now() - ctx.startTime,
                    context: "transaction commit failed"
                });
                throw commitError;
            }
        });
    }

    function saveCreds() {
        return globalMutex.runExclusive(() => {
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
        });
    }

    async function performIntegrityCheck() {
        return globalMutex.runExclusive(() => {
            try {
                const isOk = db.integrityCheck();
                logger.info({ 
                    isOk,
                    context: "integrity check completed"
                });
                return isOk;
            } catch (e) {
                logger.error({ err: e.message, context: "performIntegrityCheck" });
                return false;
            }
        });
    }

    async function getDbStats() {
        try {
            return db.getStats();
        } catch (e) {
            logger.error({ err: e.message, context: "getDbStats" });
            return null;
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
        isInTransaction,
        integrityCheck: performIntegrityCheck,
        getStats: getDbStats,
        _flushNow: async () => {
            try {
                await db.flush();
            } catch (e) {
                logger.error({ err: e.message, context: "_flushNow" });
            }
        },
        _dispose: async () => {
            return globalMutex.runExclusive(async () => {
                try {
                    await db.flush();
                    keyQueues.clear();
                    txMutexes.clear();
                    logger.info({ context: "_dispose: cleanup completed" });
                } catch (e) {
                    logger.error({ err: e.message, context: "_dispose" });
                }
            });
        },
        db: db.db,
        get closed() {
            return db.disposed;
        },
    };
}