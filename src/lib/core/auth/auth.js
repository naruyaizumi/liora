/**
 * @file SQLite-based authentication state management for Baileys
 * @module auth/sqlite-auth
 * @description Production-grade authentication state persistence with transaction support,
 * connection pooling, and robust error handling for WhatsApp Web sessions.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";
import { AsyncLocalStorage } from "async_hooks";
import { Mutex } from "async-mutex";
import PQueue from "p-queue";
import db from "./core.js";
import { makeKey, validateKey, validateValue } from "./config.js";

/**
 * Default transaction options for atomic operations
 * @constant {Object}
 */
const DEFAULT_TRANSACTION_OPTIONS = {
    maxCommitRetries: 5,
    delayBetweenTriesMs: 200,
};

/**
 * Promise-based delay utility
 * @function delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates SQLite-based authentication state manager for Baileys
 * @export
 * @function useSQLiteAuthState
 * @param {string} _dbPath - Database file path (unused, uses global db)
 * @param {Object} options - Transaction options
 * @returns {Object} Authentication state manager
 *
 * @features
 * - Transaction support with automatic retries
 * - Connection pooling and mutex locking
 * - Async context preservation
 * - Automatic credential persistence
 * - Cache coherency with write-through
 *
 * @transactionMechanism
 * - Uses AsyncLocalStorage for transaction context
 * - Mutex locks per key type for consistency
 * - Retry logic for commit failures
 * - Automatic rollback on errors
 */
export function useSQLiteAuthState(_dbPath, options = {}) {
    const txOptions = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

    let creds;

    try {
        const row = db.get("creds");
        if (row?.value) {
            creds = row.value;
            if (!creds || typeof creds !== "object") {
                global.logger.warn({ context: "SQLiteAuth: invalid creds, reinitializing" });
                creds = initAuthCreds();
            }
        } else {
            creds = initAuthCreds();
        }
    } catch (e) {
        global.logger.error({ err: e.message, context: "SQLiteAuth init" });
        creds = initAuthCreds();
    }

    const txStorage = new AsyncLocalStorage();
    const keyQueues = new Map();
    const txMutexes = new Map();

    /**
     * Gets or creates queue for specific key type
     * @function getQueue
     * @param {string} key - Key type identifier
     * @returns {PQueue} Priority queue instance
     */
    function getQueue(key) {
        if (!keyQueues.has(key)) {
            keyQueues.set(key, new PQueue({ concurrency: 1 }));
        }
        return keyQueues.get(key);
    }

    /**
     * Gets or creates mutex for transaction isolation
     * @function getTxMutex
     * @param {string} key - Key type identifier
     * @returns {Mutex} Mutex instance
     */
    function getTxMutex(key) {
        if (!txMutexes.has(key)) {
            txMutexes.set(key, new Mutex());
        }
        return txMutexes.get(key);
    }

    /**
     * Checks if currently executing within a transaction
     * @function isInTransaction
     * @returns {boolean} True if in transaction context
     */
    function isInTransaction() {
        return !!txStorage.getStore();
    }

    /**
     * Commits transaction mutations with automatic retry
     * @async
     * @function commitWithRetry
     * @param {Object} mutations - Key-value mutations to commit
     * @throws {Error} On persistent commit failure
     */
    async function commitWithRetry(mutations) {
        if (Object.keys(mutations).length === 0) {
            global.logger.trace("no mutations in transaction");
            return;
        }

        global.logger.trace("committing transaction");

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

                global.logger.trace(
                    { mutationCount: Object.keys(mutations).length },
                    "committed transaction"
                );
                return;
            } catch (error) {
                const retriesLeft = txOptions.maxCommitRetries - attempt - 1;
                global.logger.warn(`failed to commit mutations, retries left=${retriesLeft}`);

                if (retriesLeft === 0) {
                    throw error;
                }

                await delay(txOptions.delayBetweenTriesMs);
            }
        }
    }

    /**
     * Retrieves multiple keys with transaction awareness
     * @async
     * @function keysGet
     * @param {string} type - Key type/category
     * @param {Array<string>} ids - Key identifiers
     * @returns {Promise<Object>} Key-value mapping
     */
    async function keysGet(type, ids) {
        if (!type || !Array.isArray(ids)) {
            global.logger.warn({ type, ids, context: "keys.get: invalid params" });
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
                    global.logger.error({ err: e.message, key: k, context: "keys.get" });
                }
            }

            return result;
        }

        const cached = ctx.cache[type] || {};
        const missing = ids.filter((id) => !(id in cached));

        if (missing.length > 0) {
            ctx.dbQueries++;
            global.logger.trace(
                { type, count: missing.length },
                "fetching missing keys in transaction"
            );

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
                        global.logger.error({ err: e.message, key: k, context: "keys.get fetch" });
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

    /**
     * Sets multiple keys with transaction awareness
     * @async
     * @function keysSet
     * @param {Object} data - Key-value data organized by type
     */
    async function keysSet(data) {
        if (!data || typeof data !== "object") {
            global.logger.warn({ context: "keys.set: invalid data" });
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
                                global.logger.error({
                                    err: e.message,
                                    type,
                                    id,
                                    context: "keys.set",
                                });
                            }
                        }
                    })
                )
            );

            return;
        }

        global.logger.trace({ types: Object.keys(data) }, "caching in transaction");

        for (const type in data) {
            const bucket = data[type];

            ctx.cache[type] = ctx.cache[type] || {};
            ctx.mutations[type] = ctx.mutations[type] || {};

            Object.assign(ctx.cache[type], bucket);
            Object.assign(ctx.mutations[type], bucket);
        }
    }

    /**
     * Clears all authentication keys
     * @async
     * @function keysClear
     */
    async function keysClear() {
        try {
            global.logger.info({ context: "keys.clear: clearing all keys" });
            db.db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            db.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
            db.cache.clear();
        } catch (e) {
            global.logger.error({ err: e.message, context: "keys.clear" });
        }
    }

    /**
     * Executes work within a transactional context
     * @async
     * @function transaction
     * @param {Function} work - Async function to execute
     * @param {string} key - Transaction isolation key
     * @returns {Promise<*>} Work result
     *
     * @transactionBehavior
     * - Automatic commit on success
     * - Automatic rollback on error
     * - Nested transactions reuse parent context
     * - Mutex isolation per key type
     * - Performance monitoring
     */
    async function transaction(work, key = "default") {
        if (typeof work !== "function") {
            global.logger.error({ context: "transaction: work must be a function" });
            throw new Error("Transaction work must be a function");
        }

        const existing = txStorage.getStore();

        if (existing) {
            global.logger.trace("reusing existing transaction context");
            return work();
        }

        return getTxMutex(key).runExclusive(async () => {
            const ctx = {
                cache: {},
                mutations: {},
                dbQueries: 0,
            };

            global.logger.trace("entering transaction");

            try {
                const result = await txStorage.run(ctx, work);

                await commitWithRetry(ctx.mutations);

                global.logger.trace({ dbQueries: ctx.dbQueries }, "transaction completed");

                return result;
            } catch (error) {
                global.logger.error({ error }, "transaction failed, rolling back");
                throw error;
            }
        });
    }

    /**
     * Persists credentials to database
     * @function saveCreds
     * @returns {boolean} Success status
     */
    function saveCreds() {
        try {
            if (!creds || typeof creds !== "object") {
                global.logger.error({ context: "saveCreds: invalid creds" });
                return false;
            }

            db.set("creds", creds);
            return true;
        } catch (e) {
            global.logger.error({ err: e.message, context: "saveCreds" });
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
                global.logger.error({ err: e.message, context: "_flushNow" });
            }
        },
        _forceVacuum: async () => {
            try {
                await db.forceVacuum();
            } catch (e) {
                global.logger.error({ err: e.message, context: "_forceVacuum" });
            }
        },
        _dispose: async () => {
            try {
                await db.flush();
                keyQueues.clear();
                txMutexes.clear();
            } catch (e) {
                global.logger.error({ err: e.message, context: "_dispose" });
            }
        },
        db: db.db,
        get closed() {
            return db.disposed;
        },
    };
}
