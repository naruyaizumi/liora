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

                logger.trace(
                    { mutationCount: Object.keys(mutations).length },
                    "committed transaction"
                );
                return;
            } catch (error) {
                const retriesLeft = txOptions.maxCommitRetries - attempt - 1;
                logger.warn(`failed to commit mutations, retries left=${retriesLeft}`);

                if (retriesLeft === 0) {
                    throw error;
                }

                await delay(txOptions.delayBetweenTriesMs);
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

            for (const id of ids) {
                const k = makeKey(type, id);
                if (!validateKey(k)) continue;

                try {
                    const row = db.get(k);
                    if (row?.value) {
                        result[id] = row.value;
                    }
                } catch (e) {
                    logger.error({ err: e.message, key: k, context: "keys.get" });
                }
            }

            return result;
        }

        const cached = ctx.cache[type] || {};
        const missing = ids.filter((id) => !(id in cached));

        if (missing.length > 0) {
            ctx.dbQueries++;
            logger.trace({ type, count: missing.length }, "fetching missing keys in transaction");

            const fetched = await getTxMutex(type).runExclusive(async () => {
                const result = {};

                for (const id of missing) {
                    const k = makeKey(type, id);
                    if (!validateKey(k)) continue;

                    try {
                        const row = db.get(k);
                        if (row?.value) {
                            result[id] = row.value;
                        }
                    } catch (e) {
                        logger.error({ err: e.message, key: k, context: "keys.get fetch" });
                    }
                }

                return result;
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
            };

            logger.trace("entering transaction");

            try {
                const result = await txStorage.run(ctx, work);

                await commitWithRetry(ctx.mutations);

                logger.trace({ dbQueries: ctx.dbQueries }, "transaction completed");

                return result;
            } catch (error) {
                logger.error({ error }, "transaction failed, rolling back");
                throw error;
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
        isInTransaction,
        _flushNow: async () => {
            try {
                await db.flush();
            } catch (e) {
                logger.error({ err: e.message, context: "_flushNow" });
            }
        },
        _dispose: async () => {
            try {
                await db.flush();
                keyQueues.clear();
                txMutexes.clear();
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
