/**
 * @file SQLite-based authentication state management for Baileys
 * @module auth/sqlite-auth
 * @description Production-grade authentication state persistence with transaction support,
 * connection pooling, and robust error handling for WhatsApp Web sessions.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { initAuthCreds } from "baileys";
import { AsyncLocalStorage } from "async_hooks";
import { Mutex } from "async-mutex";
import PQueue from "p-queue";
import db from "./core.js";
import { makeKey, validateKey, validateValue } from "./config.js";

const DEFAULT_TRANSACTION_OPTIONS = {
    maxCommitRetries: 5,
    delayBetweenTriesMs: 200,
    transactionTimeout: 30000,
};

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function exponentialBackoff(attempt, baseDelay) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay;
    return Math.min(exponentialDelay + jitter, 10000);
}

export function useSQLiteAuthState(_dbPath, options = {}) {
    const txOptions = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

    let creds;

    try {
        const row = db.get("creds");
        if (row?.value) {
            creds = row.value;
            if (!creds || typeof creds !== "object") {
                creds = initAuthCreds();
            }
        } else {
            creds = initAuthCreds();
        }
    } catch {
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
            return;
        }

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

                return;
            } catch (error) {
                const retriesLeft = txOptions.maxCommitRetries - attempt - 1;

                if (retriesLeft === 0) {
                    throw error;
                }

                await delay(exponentialBackoff(attempt, txOptions.delayBetweenTriesMs));
            }
        }
    }

    async function keysGet(type, ids) {
        if (!type || !Array.isArray(ids)) {
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
                } catch {
                    // Silent fail, continue processing
                }
            }

            return result;
        }

        const cached = ctx.cache[type] || {};
        const missing = ids.filter((id) => !(id in cached));

        if (missing.length > 0) {
            ctx.dbQueries++;

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
                    } catch {
                        // Silent fail
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
                            } catch {
                                // Silent fail
                            }
                        }
                    })
                )
            );

            return;
        }

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
            db.db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            db.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
            db.cache.clear();
        } catch {
            // Silent fail
        }
    }

    async function transaction(work, key = "default") {
        if (typeof work !== "function") {
            return null;
        }

        const existing = txStorage.getStore();

        if (existing) {
            return work();
        }

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Transaction timeout")), txOptions.transactionTimeout)
        );

        const txPromise = getTxMutex(key).runExclusive(async () => {
            const ctx = {
                cache: {},
                mutations: {},
                dbQueries: 0,
            };

            try {
                const result = await txStorage.run(ctx, work);
                await commitWithRetry(ctx.mutations);
                return result;
            } catch (error) {
                throw error;
            }
        });

        try {
            return await Promise.race([txPromise, timeoutPromise]);
        } catch {
            return null;
        }
    }

    function saveCreds() {
        try {
            if (!creds || typeof creds !== "object") {
                return false;
            }

            db.set("creds", creds);
            return true;
        } catch {
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
            } catch {
                // Silent fail
            }
        },
        _forceVacuum: async () => {
            try {
                await db.forceVacuum();
            } catch {
                // Silent fail
            }
        },
        _dispose: async () => {
            try {
                await db.flush();
                keyQueues.clear();
                txMutexes.clear();
            } catch {
                // Silent fail
            }
        },
        db: db.db,
        get closed() {
            return db.disposed;
        },
    };
}