/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";
import { AsyncLocalStorage } from "async_hooks";
import { Mutex } from "async-mutex";
import PQueue from "p-queue";
import db from "./database-core.js";
import { logger, makeKey, validateKey, validateValue } from "./database-config.js";

const DEFAULT_TRANSACTION_OPTIONS = {
    maxCommitRetries: 5,
    delayBetweenTriesMs: 100,
    maxDelayMs: 2000,
    transactionMode: "IMMEDIATE", // DEFERRED, IMMEDIATE, EXCLUSIVE
    transactionTimeout: 30000,
};

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function exponentialBackoff(attempt, baseDelay, maxDelay) {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * delay * 0.1;
}

export function SQLiteAuth(_dbPath, options = {}) {
    const txOptions = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

    let creds;
    let credsInitialized = false;
    const credsMutex = new Mutex();

    async function initializeCreds() {
        return credsMutex.runExclusive(() => {
            if (credsInitialized) {
                return creds;
            }

            try {
                const row = db.get("creds");

                if (row?.value) {
                    creds = row.value;

                    if (
                        !creds ||
                        typeof creds !== "object" ||
                        !creds.noiseKey ||
                        !creds.signedIdentityKey
                    ) {
                        logger.warn("Invalid credentials structure, reinitializing");
                        creds = initAuthCreds();
                    } else {
                        logger.info("Credentials loaded from database");
                    }
                } else {
                    logger.info("No existing credentials found, creating new");
                    creds = initAuthCreds();
                }

                credsInitialized = true;
                return creds;
            } catch (e) {
                logger.error(
                    { err: e, context: "initializeCreds" },
                    "Failed to initialize credentials"
                );
                creds = initAuthCreds();
                credsInitialized = true;
                return creds;
            }
        });
    }

    try {
        const row = db.get("creds");
        if (row?.value && row.value.noiseKey && row.value.signedIdentityKey) {
            creds = row.value;
            credsInitialized = true;
        } else {
            creds = initAuthCreds();
            credsInitialized = true;
        }
    } catch (e) {
        logger.error({ err: e, context: "SQLiteAuth init" });
        creds = initAuthCreds();
        credsInitialized = true;
    }

    const txStorage = new AsyncLocalStorage();
    const keyQueues = new Map();
    const txMutexes = new Map();
    const globalMutex = new Mutex();

    const stats = {
        transactions: 0,
        commits: 0,
        rollbacks: 0,
        retries: 0,
        errors: 0,
        cacheHits: 0,
        cacheMisses: 0,
    };

    function getQueue(key) {
        if (!keyQueues.has(key)) {
            const queue = new PQueue({
                concurrency: 1,
                timeout: txOptions.transactionTimeout,
                throwOnTimeout: true,
            });

            queue.on("error", (error) => {
                logger.error({ err: error, key }, "Queue error");
            });

            keyQueues.set(key, queue);
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
        const mutationCount = Object.keys(mutations).reduce((count, type) => {
            return count + Object.keys(mutations[type]).length;
        }, 0);

        if (mutationCount === 0) {
            logger.trace("No mutations to commit");
            return { success: true, operations: 0 };
        }

        for (let attempt = 0; attempt < txOptions.maxCommitRetries; attempt++) {
            try {
                const startTime = Date.now();

                const commitTx = db.db.transaction(() => {
                    let operations = 0;

                    for (const type in mutations) {
                        const bucket = mutations[type];

                        for (const id in bucket) {
                            const k = makeKey(type, id);
                            const v = bucket[id];

                            if (!validateKey(k)) {
                                continue;
                            }

                            if (v === null || v === undefined) {
                                db.del(k);
                                operations++;
                            } else if (validateValue(v)) {
                                db.set(k, v);
                                operations++;
                            } else {
                                logger.warn({ key: k }, "Invalid value, skipping");
                            }
                        }
                    }

                    return operations;
                });

                const operations = commitTx[txOptions.transactionMode.toLowerCase()]();

                const duration = Date.now() - startTime;
                stats.commits++;

                return { success: true, operations, duration };
            } catch (error) {
                const retriesLeft = txOptions.maxCommitRetries - attempt - 1;
                stats.retries++;

                const isRetryable =
                    error.code === "SQLITE_BUSY" ||
                    error.code === "SQLITE_LOCKED" ||
                    error.message?.includes("database is locked") ||
                    error.message?.includes("SQLITE_BUSY");

                if (!isRetryable) {
                    stats.errors++;
                    logger.error({
                        err: error,
                        code: error.code,
                        mutationCount,
                        context: "commitWithRetry: non-retryable error",
                    });
                    throw error;
                }

                if (retriesLeft === 0) {
                    stats.errors++;
                    logger.error({
                        err: error,
                        mutationCount,
                        attempts: attempt + 1,
                        context: "commitWithRetry: max retries exceeded",
                    });
                    throw new Error(
                        `Transaction failed after ${attempt + 1} attempts: ${error.message}`
                    );
                }

                const delayMs = exponentialBackoff(
                    attempt,
                    txOptions.delayBetweenTriesMs,
                    txOptions.maxDelayMs
                );

                logger.warn({
                    err: error.message,
                    code: error.code,
                    retriesLeft,
                    delayMs,
                    context: "commitWithRetry: retrying after database busy",
                });

                await delay(delayMs);
            }
        }

        throw new Error("Transaction commit failed unexpectedly");
    }

    async function keysGet(type, ids) {
        if (!type || !Array.isArray(ids)) {
            logger.warn({ type, ids, context: "keys.get: invalid params" });
            return {};
        }

        if (ids.length === 0) {
            return {};
        }

        const ctx = txStorage.getStore();

        if (!ctx) {
            const result = {};
            const keys = ids.map((id) => makeKey(type, id)).filter(validateKey);

            if (keys.length === 0) {
                return result;
            }

            try {
                const data = db.getMany(keys);

                for (const id of ids) {
                    const k = makeKey(type, id);
                    if (k in data && data[k] !== null && data[k] !== undefined) {
                        result[id] = data[k];
                        stats.cacheHits++;
                    } else {
                        stats.cacheMisses++;
                    }
                }

                return result;
            } catch (e) {
                stats.errors++;
                logger.error(
                    {
                        err: e,
                        type,
                        count: ids.length,
                        context: "keys.get",
                    },
                    "Failed to get keys"
                );
                return result;
            }
        }

        const cached = ctx.cache[type] || {};
        const missing = ids.filter((id) => !(id in cached));

        if (missing.length > 0) {
            ctx.dbQueries++;
            logger.trace(
                {
                    type,
                    count: missing.length,
                    cached: ids.length - missing.length,
                },
                "Fetching missing keys in transaction"
            );

            const fetched = await getTxMutex(type).runExclusive(async () => {
                const result = {};
                const keys = missing.map((id) => makeKey(type, id)).filter(validateKey);

                if (keys.length === 0) {
                    return result;
                }

                try {
                    const data = db.getMany(keys);

                    for (const id of missing) {
                        const k = makeKey(type, id);
                        if (k in data && data[k] !== null && data[k] !== undefined) {
                            result[id] = data[k];
                            stats.cacheHits++;
                        } else {
                            stats.cacheMisses++;
                        }
                    }

                    return result;
                } catch (e) {
                    stats.errors++;
                    logger.error(
                        {
                            err: e,
                            type,
                            count: missing.length,
                            context: "keys.get fetch",
                        },
                        "Failed to fetch missing keys"
                    );
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
            return { success: false, error: "Invalid data" };
        }

        const types = Object.keys(data);
        if (types.length === 0) {
            return { success: true, operations: 0 };
        }

        const ctx = txStorage.getStore();

        if (!ctx) {
            try {
                await Promise.all(
                    types.map((type) =>
                        getQueue(type).add(async () => {
                            const bucket = data[type];
                            let operations = 0;

                            for (const id in bucket) {
                                try {
                                    const k = makeKey(type, id);
                                    const v = bucket[id];

                                    if (!validateKey(k)) {
                                        continue;
                                    }

                                    if (v === null || v === undefined) {
                                        db.del(k);
                                        operations++;
                                    } else if (validateValue(v)) {
                                        db.set(k, v);
                                        operations++;
                                    } else {
                                        logger.warn({ key: k }, "Invalid value, skipping");
                                    }
                                } catch (e) {
                                    stats.errors++;
                                    logger.error(
                                        {
                                            err: e,
                                            type,
                                            id,
                                            context: "keys.set",
                                        },
                                        "Failed to set key"
                                    );
                                }
                            }

                            return operations;
                        })
                    )
                );

                return { success: true };
            } catch (e) {
                stats.errors++;
                logger.error({ err: e, context: "keys.set: queue error" });
                return { success: false, error: e.message };
            }
        }

        logger.trace(
            {
                types,
                totalKeys: types.reduce((sum, t) => sum + Object.keys(data[t]).length, 0),
            },
            "Caching in transaction"
        );

        for (const type in data) {
            const bucket = data[type];

            ctx.cache[type] = ctx.cache[type] || {};
            ctx.mutations[type] = ctx.mutations[type] || {};

            Object.assign(ctx.cache[type], bucket);
            Object.assign(ctx.mutations[type], bucket);
        }

        return { success: true };
    }

    async function keysClear() {
        return globalMutex.runExclusive(async () => {
            try {
                logger.warn("Clearing all keys from database");

                const clearTx = db.db.transaction(() => {
                    const count = db.db
                        .prepare("SELECT COUNT(*) as count FROM baileys_state WHERE key LIKE '%-%'")
                        .get().count;

                    db.db.prepare("DELETE FROM baileys_state WHERE key LIKE '%-%'").run();

                    return count;
                });

                const count = clearTx.immediate();

                db.db.pragma("wal_checkpoint(PASSIVE)");

                db.cache.clear();

                logger.info({ count }, "All keys cleared successfully");
                return { success: true, count };
            } catch (e) {
                stats.errors++;
                logger.error({ err: e, context: "keys.clear" }, "Failed to clear keys");
                return { success: false, error: e.message };
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
            logger.trace("Reusing existing transaction context");
            return work();
        }

        stats.transactions++;

        return getTxMutex(key).runExclusive(async () => {
            const ctx = {
                cache: {},
                mutations: {},
                dbQueries: 0,
                startTime: Date.now(),
                key,
            };

            let result;
            let error;
            let timedOut = false;

            const timeoutHandle = setTimeout(() => {
                timedOut = true;
                logger.error({
                    key,
                    duration: Date.now() - ctx.startTime,
                    context: "transaction timeout",
                });
            }, txOptions.transactionTimeout);

            try {
                result = await txStorage.run(ctx, work);

                if (timedOut) {
                    throw new Error(`Transaction timeout after ${txOptions.transactionTimeout}ms`);
                }
            } catch (err) {
                error = err;
            } finally {
                clearTimeout(timeoutHandle);
            }

            if (error) {
                stats.rollbacks++;
                const duration = Date.now() - ctx.startTime;

                logger.error({
                    error: error.message,
                    duration,
                    dbQueries: ctx.dbQueries,
                    key,
                    context: "transaction failed, rolling back",
                });

                throw error;
            }

            try {
                const commitResult = await commitWithRetry(ctx.mutations);
                const duration = Date.now() - ctx.startTime;

                return result;
            } catch (commitError) {
                stats.errors++;
                const duration = Date.now() - ctx.startTime;

                logger.error({
                    error: commitError.message,
                    duration,
                    dbQueries: ctx.dbQueries,
                    key,
                    context: "transaction commit failed",
                });

                throw commitError;
            }
        });
    }

    async function saveCreds() {
        return globalMutex.runExclusive(async () => {
            try {
                if (!creds || typeof creds !== "object") {
                    logger.error({ context: "saveCreds: invalid creds" });
                    return { success: false, error: "Invalid credentials" };
                }

                if (!creds.noiseKey || !creds.signedIdentityKey) {
                    logger.error({ context: "saveCreds: missing required fields" });
                    return { success: false, error: "Missing required credential fields" };
                }

                db.set("creds", creds);

                return { success: true };
            } catch (e) {
                stats.errors++;
                logger.error({ err: e, context: "saveCreds" }, "Failed to save credentials");
                return { success: false, error: e.message };
            }
        });
    }

    async function performIntegrityCheck() {
        return globalMutex.runExclusive(async () => {
            try {
                logger.info("Starting integrity check");

                const dbCheck = db.integrityCheck();
                const credsCheck = creds && creds.noiseKey && creds.signedIdentityKey;

                const result = {
                    database: dbCheck,
                    credentials: credsCheck,
                    overall: dbCheck && credsCheck,
                };

                logger.info({
                    result,
                    context: "integrity check completed",
                });

                return result;
            } catch (e) {
                stats.errors++;
                logger.error({ err: e, context: "performIntegrityCheck" });
                return {
                    database: false,
                    credentials: false,
                    overall: false,
                    error: e.message,
                };
            }
        });
    }

    async function getDbStats() {
        try {
            const dbStats = db.getStats();

            return {
                database: dbStats,
                auth: {
                    transactions: stats.transactions,
                    commits: stats.commits,
                    rollbacks: stats.rollbacks,
                    retries: stats.retries,
                    errors: stats.errors,
                    cacheHits: stats.cacheHits,
                    cacheMisses: stats.cacheMisses,
                    cacheHitRate: stats.cacheHits / (stats.cacheHits + stats.cacheMisses) || 0,
                },
                queues: {
                    count: keyQueues.size,
                    keys: Array.from(keyQueues.keys()),
                },
                credentials: {
                    initialized: credsInitialized,
                    valid: !!(creds && creds.noiseKey && creds.signedIdentityKey),
                },
            };
        } catch (e) {
            logger.error({ err: e, context: "getDbStats" });
            return null;
        }
    }

    async function cleanup() {
        return globalMutex.runExclusive(async () => {
            try {
                logger.info("Starting auth cleanup");

                await db.flush();

                for (const queue of keyQueues.values()) {
                    queue.clear();
                }
                keyQueues.clear();
                txMutexes.clear();

                logger.info({
                    stats,
                    context: "auth cleanup completed",
                });

                return { success: true };
            } catch (e) {
                logger.error({ err: e, context: "cleanup" });
                return { success: false, error: e.message };
            }
        });
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
        initializeCreds,

        _flushNow: async () => {
            try {
                await db.flush();
                return { success: true };
            } catch (e) {
                logger.error({ err: e, context: "_flushNow" });
                return { success: false, error: e.message };
            }
        },

        _dispose: cleanup,

        db: db.db,

        get closed() {
            return db.disposed;
        },

        get healthy() {
            return !db.disposed && credsInitialized && stats.errors < 10;
        },
    };
}
