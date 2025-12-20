import { initAuthCreds } from "baileys";
import { AsyncLocalStorage } from "async_hooks";
import { Mutex } from "async-mutex";
import PQueue from "p-queue";
import db from "./database-core.js";
import { logger, makeKey, validateKey, validateValue } from "./database-config.js";

const DEFAULT_TX_OPTIONS = {
    maxRetries: 5,
    retryDelay: 100,
    maxDelay: 2000,
    timeout: 30000,
};

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function exponentialBackoff(attempt, baseDelay, maxDelay) {
    const delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delayMs + Math.random() * delayMs * 0.1;
}

export function SQLiteAuth(_dbPath, options = {}) {
    const txOptions = { ...DEFAULT_TX_OPTIONS, ...options };

    let creds;
    let credsInitialized = false;
    const credsMutex = new Mutex();

    async function initializeCreds() {
        return credsMutex.runExclusive(() => {
            if (credsInitialized) return creds;

            try {
                const row = db.get("creds");

                if (row?.value?.noiseKey && row.value.signedIdentityKey) {
                    creds = row.value;
                } else {
                    creds = initAuthCreds();
                }

                credsInitialized = true;
                return creds;
            } catch (e) {
                logger.error({ err: e }, "Init creds failed");
                creds = initAuthCreds();
                credsInitialized = true;
                return creds;
            }
        });
    }

    try {
        const row = db.get("creds");
        if (row?.value?.noiseKey && row.value.signedIdentityKey) {
            creds = row.value;
            credsInitialized = true;
        } else {
            creds = initAuthCreds();
            credsInitialized = true;
        }
    } catch (e) {
        logger.error({ err: e }, "SQLiteAuth init failed");
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
    };

    function getQueue(key) {
        if (!keyQueues.has(key)) {
            keyQueues.set(key, new PQueue({
                concurrency: 1,
                timeout: txOptions.timeout,
                throwOnTimeout: true,
            }));
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

        if (mutationCount === 0) return { success: true, operations: 0 };

        for (let attempt = 0; attempt < txOptions.maxRetries; attempt++) {
            try {
                const commitTx = db.db.transaction(() => {
                    let operations = 0;

                    for (const type in mutations) {
                        const bucket = mutations[type];

                        for (const id in bucket) {
                            const k = makeKey(type, id);
                            const v = bucket[id];

                            if (!validateKey(k)) continue;

                            if (v === null || v === undefined) {
                                db.del(k);
                                operations++;
                            } else if (validateValue(v)) {
                                db.set(k, v);
                                operations++;
                            }
                        }
                    }

                    return operations;
                });

                const operations = commitTx.immediate();
                stats.commits++;

                return { success: true, operations };
            } catch (error) {
                const retriesLeft = txOptions.maxRetries - attempt - 1;
                stats.retries++;

                const isRetryable =
                    error.code === "SQLITE_BUSY" ||
                    error.code === "SQLITE_LOCKED" ||
                    error.message?.includes("database is locked");

                if (!isRetryable || retriesLeft === 0) {
                    stats.errors++;
                    logger.error({ err: error, attempts: attempt + 1 }, "Commit failed");
                    throw new Error(
                        `Transaction failed after ${attempt + 1} attempts: ${error.message}`
                    );
                }

                const delayMs = exponentialBackoff(
                    attempt,
                    txOptions.retryDelay,
                    txOptions.maxDelay
                );

                await delay(delayMs);
            }
        }

        throw new Error("Transaction commit failed");
    }

    async function keysGet(type, ids) {
        if (!type || !Array.isArray(ids) || ids.length === 0) {
            return {};
        }

        const ctx = txStorage.getStore();

        if (!ctx) {
            const result = {};
            const keys = ids.map((id) => makeKey(type, id)).filter(validateKey);

            if (keys.length === 0) return result;

            try {
                const data = db.getMany(keys);

                for (const id of ids) {
                    const k = makeKey(type, id);
                    if (k in data && data[k] !== null && data[k] !== undefined) {
                        result[id] = data[k];
                    }
                }

                return result;
            } catch (e) {
                stats.errors++;
                logger.error({ err: e, type, count: ids.length }, "Keys get failed");
                return result;
            }
        }

        const cached = ctx.cache[type] || {};
        const missing = ids.filter((id) => !(id in cached));

        if (missing.length > 0) {
            const fetched = await getTxMutex(type).runExclusive(async () => {
                const result = {};
                const keys = missing.map((id) => makeKey(type, id)).filter(validateKey);

                if (keys.length === 0) return result;

                try {
                    const data = db.getMany(keys);

                    for (const id of missing) {
                        const k = makeKey(type, id);
                        if (k in data && data[k] !== null && data[k] !== undefined) {
                            result[id] = data[k];
                        }
                    }

                    return result;
                } catch (e) {
                    stats.errors++;
                    logger.error({ err: e, type, count: missing.length }, "Fetch failed");
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
            return { success: false, error: "Invalid data" };
        }

        const types = Object.keys(data);
        if (types.length === 0) return { success: true, operations: 0 };

        const ctx = txStorage.getStore();

        if (!ctx) {
            try {
                await Promise.all(
                    types.map((type) =>
                        getQueue(type).add(async () => {
                            const bucket = data[type];

                            for (const id in bucket) {
                                try {
                                    const k = makeKey(type, id);
                                    const v = bucket[id];

                                    if (!validateKey(k)) continue;

                                    if (v === null || v === undefined) {
                                        db.del(k);
                                    } else if (validateValue(v)) {
                                        db.set(k, v);
                                    }
                                } catch (e) {
                                    stats.errors++;
                                    logger.error({ err: e, type, id }, "Set failed");
                                }
                            }
                        })
                    )
                );

                return { success: true };
            } catch (e) {
                stats.errors++;
                logger.error({ err: e }, "Keys set queue failed");
                return { success: false, error: e.message };
            }
        }

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

                return { success: true, count };
            } catch (e) {
                stats.errors++;
                logger.error({ err: e }, "Keys clear failed");
                return { success: false, error: e.message };
            }
        });
    }

    async function transaction(work, key = "default") {
        if (typeof work !== "function") {
            throw new Error("Transaction work must be a function");
        }

        const existing = txStorage.getStore();
        if (existing) return work();

        stats.transactions++;

        return getTxMutex(key).runExclusive(async () => {
            const ctx = {
                cache: {},
                mutations: {},
                startTime: Date.now(),
                key,
            };

            let result;
            let error;
            let timedOut = false;

            const timeoutHandle = setTimeout(() => {
                timedOut = true;
            }, txOptions.timeout);

            try {
                result = await txStorage.run(ctx, work);

                if (timedOut) {
                    throw new Error(`Transaction timeout after ${txOptions.timeout}ms`);
                }

                await commitWithRetry(ctx.mutations);
            } catch (err) {
                error = err;
            } finally {
                clearTimeout(timeoutHandle);
            }

            if (error) {
                stats.rollbacks++;
                logger.error({ err: error, key }, "Transaction failed");
                throw error;
            }

            return result;
        });
    }

    async function saveCreds() {
        return globalMutex.runExclusive(async () => {
            try {
                if (!creds?.noiseKey || !creds?.signedIdentityKey) {
                    return { success: false, error: "Invalid credentials" };
                }

                db.set("creds", creds);
                return { success: true };
            } catch (e) {
                stats.errors++;
                logger.error({ err: e }, "Save creds failed");
                return { success: false, error: e.message };
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
                },
                credentials: {
                    initialized: credsInitialized,
                    valid: !!(creds?.noiseKey && creds?.signedIdentityKey),
                },
            };
        } catch (e) {
            logger.error({ err: e }, "GetDbStats failed");
            return null;
        }
    }

    async function cleanup() {
        return globalMutex.runExclusive(async () => {
            try {
                await db.flush();

                for (const queue of keyQueues.values()) {
                    queue.clear();
                }
                keyQueues.clear();
                txMutexes.clear();

                return { success: true };
            } catch (e) {
                logger.error({ err: e }, "Cleanup failed");
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
        getStats: getDbStats,
        initializeCreds,
        _flushNow: async () => {
            try {
                await db.flush();
                return { success: true };
            } catch (e) {
                logger.error({ err: e }, "Flush failed");
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