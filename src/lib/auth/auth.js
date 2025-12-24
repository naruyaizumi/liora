/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";
import { AsyncLocalStorage } from "async_hooks";
import { Mutex } from "async-mutex";
import core, { makeKey } from "./core.js";

const DEFAULT_OPTIONS = {
    maxCommitRetries: 3,
    delayBetweenTriesMs: 200
};

function createKeyStore(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const txStorage = new AsyncLocalStorage();
    const txMutexes = new Map();

    function getTxMutex(key) {
        if (!txMutexes.has(key)) {
            txMutexes.set(key, new Mutex());
        }
        return txMutexes.get(key);
    }

    function isInTransaction() {
        return !!txStorage.getStore();
    }

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function commitWithRetry(mutations) {
        if (Object.keys(mutations).length === 0) {
            global.logger.trace("No mutations to commit");
            return;
        }

        global.logger.trace("Committing transaction");

        for (let attempt = 0; attempt < opts.maxCommitRetries; attempt++) {
            try {
                const operations = [];

                for (const type in mutations) {
                    for (const id in mutations[type]) {
                        const value = mutations[type][id];
                        const key = makeKey(type, id);

                        if (value === null || value === undefined) {
                            operations.push({ type: 'del', key });
                        } else {
                            operations.push({ type: 'set', key, value });
                        }
                    }
                }

                await core.batch(operations);
                global.logger.trace({ count: operations.length }, "Transaction committed");
                return;
            } catch (error) {
                const retriesLeft = opts.maxCommitRetries - attempt - 1;
                global.logger.warn(`Commit failed, retries left: ${retriesLeft}`);

                if (retriesLeft === 0) {
                    throw error;
                }

                await delay(opts.delayBetweenTriesMs);
            }
        }
    }

    async function get(type, ids) {
        const ctx = txStorage.getStore();

        if (!ctx) {
            const result = {};
            const keys = ids.map(id => makeKey(type, id));
            const data = core.getMany(keys);

            for (const id of ids) {
                const key = makeKey(type, id);
                const value = data[key];
                if (value !== null && value !== undefined) {
                    result[id] = value;
                }
            }

            return result;
        }

        const cached = ctx.cache[type] || {};
        const missing = ids.filter(id => !(id in cached));

        if (missing.length > 0) {
            ctx.dbQueries++;
            global.logger.trace({ type, count: missing.length }, "Fetching missing keys");

            const keys = missing.map(id => makeKey(type, id));
            const fetched = core.getMany(keys);

            ctx.cache[type] = ctx.cache[type] || {};
            for (const id of missing) {
                const key = makeKey(type, id);
                const value = fetched[key];
                ctx.cache[type][id] = value ?? null;
            }
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

    async function set(data) {
        const ctx = txStorage.getStore();

        if (!ctx) {
            const operations = [];

            for (const type in data) {
                for (const id in data[type]) {
                    const value = data[type][id];
                    const key = makeKey(type, id);

                    if (value === null || value === undefined) {
                        operations.push({ type: 'del', key });
                    } else {
                        operations.push({ type: 'set', key, value });
                    }
                }
            }

            await core.batch(operations);
            return;
        }

        global.logger.trace({ types: Object.keys(data) }, "Caching in transaction");

        for (const type in data) {
            ctx.cache[type] = ctx.cache[type] || {};
            ctx.mutations[type] = ctx.mutations[type] || {};

            Object.assign(ctx.cache[type], data[type]);
            Object.assign(ctx.mutations[type], data[type]);
        }
    }

    async function transaction(work, key = "default") {
        const existing = txStorage.getStore();

        if (existing) {
            global.logger.trace("Reusing existing transaction context");
            return work();
        }

        return getTxMutex(key).runExclusive(async () => {
            const ctx = {
                cache: {},
                mutations: {},
                dbQueries: 0
            };

            global.logger.trace("Entering transaction");

            try {
                const result = await txStorage.run(ctx, work);

                await commitWithRetry(ctx.mutations);

                global.logger.trace({ dbQueries: ctx.dbQueries }, "Transaction completed");
                return result;
            } catch (error) {
                global.logger.error({ error: error.message }, "Transaction failed, rolling back");
                throw error;
            }
        });
    }

    async function clear() {
        await core.clear();
    }

    function cleanup() {
        txMutexes.clear();
    }

    return {
        get,
        set,
        clear,
        transaction,
        isInTransaction,
        cleanup
    };
}

export function useSqliteFileAuthState (_dbPath, _options) {
    let creds;
    try {
        const credsData = core.get("creds");
        creds = credsData || initAuthCreds();
    } catch (e) {
        global.logger.error(`Failed to load creds: ${e.message}`);
        creds = initAuthCreds();
    }

    const keyStore = createKeyStore(_options);

    const keys = {
        async get(type, ids) {
            return keyStore.get(type, ids);
        },

        async set(data) {
            return keyStore.set(data);
        },

        async clear() {
            return keyStore.clear();
        },

        transaction(work, key) {
            return keyStore.transaction(work, key);
        },

        isInTransaction() {
            return keyStore.isInTransaction();
        }
    };

    function saveCreds() {
        if (core.isHealthy()) {
            return core.set("creds", creds);
        }
    }

    async function dispose() {
        try {
            global.logger.info("Disposing auth state");
            keyStore.cleanup();
            await core.dispose();
            global.logger.info("Auth state disposed");
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
        }
    };
}