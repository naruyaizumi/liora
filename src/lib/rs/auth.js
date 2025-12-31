/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";

const BufferJSON = {
    replacer: (_k, value) => {
        if (value?.type === "Buffer" && Array.isArray(value?.data)) {
            return {
                type: "Buffer",
                data: value.data,
            };
        } else if (Buffer.isBuffer(value)) {
            return {
                type: "Buffer",
                data: Array.from(value),
            };
        } else if (value instanceof Uint8Array) {
            return {
                type: "Buffer",
                data: Array.from(value),
            };
        }
        return value;
    },
    reviver: (_k, value) => {
        if (value?.type === "Buffer" && Array.isArray(value?.data)) {
            return Buffer.from(value.data);
        }
        return value;
    },
    stringify: (data) => {
        return JSON.stringify(data, BufferJSON.replacer);
    },
    parse: (str) => {
        if (typeof str !== "string") {
            throw new Error("Input must be a string");
        }
        return JSON.parse(str, BufferJSON.reviver);
    },
};

export function useSQLAuthState(_databaseUrl, _options = {}) {
    const API_BASE = "http://127.0.0.1:8765";
    const FETCH_TIMEOUT = 30000;
    const MAX_RETRIES = 3;
    const MAX_CACHE_SIZE = 1000;
    const MAX_BATCH_SIZE = 250;
    const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;

    let creds = null;
    let initialized = false;
    let initPromise = null;
    let isDisposed = false;
    const cache = new Map();
    const makeKey = (type, id) => `${type}-${id}`;

    function addToCache(key, value) {
        if (cache.size >= MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        cache.set(key, value);
    }

    function estimatePayloadSize(data) {
        try {
            return JSON.stringify(data).length;
        } catch (e) {
            global.logger.warn({ err: e.message }, "Failed to estimate payload size");
            return 0;
        }
    }

    function chunkData(flatData, maxSize = MAX_BATCH_SIZE) {
        const chunks = [];
        const keys = Object.keys(flatData);

        let currentChunk = {};
        let currentSize = 0;
        let currentPayloadSize = 0;

        for (const key of keys) {
            const value = flatData[key];
            const itemSize = estimatePayloadSize({ [key]: value });

            if (
                (currentSize >= maxSize || currentPayloadSize + itemSize > MAX_PAYLOAD_SIZE) &&
                currentSize > 0
            ) {
                chunks.push(currentChunk);
                currentChunk = {};
                currentSize = 0;
                currentPayloadSize = 0;
            }

            currentChunk[key] = value;
            currentSize++;
            currentPayloadSize += itemSize;
        }

        if (currentSize > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    function chunkArray(array, maxSize = MAX_BATCH_SIZE) {
        const chunks = [];
        for (let i = 0; i < array.length; i += maxSize) {
            chunks.push(array.slice(i, i + maxSize));
        }
        return chunks;
    }

    async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
        let lastError;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fetchWithTimeout(url, options);
            } catch (error) {
                lastError = error;
                global.logger.warn(
                    { attempt, maxRetries: retries, url, err: error.message },
                    `Fetch attempt ${attempt} failed`
                );

                if (attempt < retries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Failed after ${retries} attempts: ${lastError.message}`);
    }

    async function validateConnection() {
        try {
            const response = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);
            return response.ok;
        } catch (e) {
            global.logger.error(
                { err: e.message, apiBase: API_BASE },
                "Unable to connect to API. Is the server running and accessible?"
            );
            return false;
        }
    }

    function ensureCredsStructure(credsObj) {
        const baseCreds = initAuthCreds();
        return {
            ...baseCreds,
            ...credsObj,
            me: credsObj.me || baseCreds.me,
            registrationId: credsObj.registrationId || baseCreds.registrationId,
            signedIdentityKey: credsObj.signedIdentityKey || baseCreds.signedIdentityKey,
            signedPreKey: credsObj.signedPreKey || baseCreds.signedPreKey,
            preKeys: Array.isArray(credsObj.preKeys)
                ? credsObj.preKeys
                : Array.isArray(baseCreds.preKeys)
                  ? baseCreds.preKeys
                  : [],
        };
    }

    async function initCreds() {
        if (initialized) return;

        try {
            const isConnected = await validateConnection();
            if (!isConnected) {
                global.logger.warn("API not accessible, using default credentials");
                creds = ensureCredsStructure(initAuthCreds());
                initialized = true;
                return;
            }

            const response = await fetchWithRetry(`${API_BASE}/get/creds`);

            if (response.ok) {
                const data = await response.json();
                if (data.value) {
                    try {
                        const saved = BufferJSON.parse(data.value);

                        creds = ensureCredsStructure(saved);

                        global.logger.info(
                            {
                                hasPreKeys: Array.isArray(creds.preKeys),
                                preKeysCount: creds.preKeys?.length || 0,
                                hasSignedPreKey: !!creds.signedPreKey,
                                hasMe: !!creds.me,
                            },
                            "Loaded existing credentials from PostgreSQL"
                        );
                    } catch (e) {
                        global.logger.error(
                            { err: e.message, dataLength: data.value?.length, stack: e.stack },
                            "Error parsing credentials from DB"
                        );
                        creds = ensureCredsStructure(initAuthCreds());
                        global.logger.warn("Failed to parse creds, initializing new creds");
                    }
                } else {
                    global.logger.info("No existing creds in DB, using new credentials");
                    creds = ensureCredsStructure(initAuthCreds());
                }
            } else {
                global.logger.warn(
                    { status: response.status, statusText: response.statusText },
                    "Failed to fetch creds from DB"
                );
                creds = ensureCredsStructure(initAuthCreds());
            }
        } catch (e) {
            global.logger.error(
                { err: e.message, apiBase: API_BASE, stack: e.stack },
                "Error loading credentials, using default initAuthCreds"
            );
            creds = ensureCredsStructure(initAuthCreds());
        } finally {
            initialized = true;
        }
    }

    async function saveCreds() {
        try {
            if (initPromise) {
                await initPromise;
            }

            const maxWaitTime = 5000;
            const startTime = Date.now();
            while (!initialized && Date.now() - startTime < maxWaitTime) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            if (!initialized) {
                return false;
            }

            if (!creds) {
                return false;
            }

            if (isDisposed) {
                return false;
            }

            const isConnected = await validateConnection();
            if (!isConnected) {
                return false;
            }

            if (!Array.isArray(creds.preKeys)) {
                global.logger.warn(
                    {
                        hasCreds: !!creds,
                        hasPreKeys: creds?.preKeys !== undefined,
                        isArray: Array.isArray(creds?.preKeys),
                        preKeysType: typeof creds?.preKeys,
                    },
                    "creds.preKeys not an array, initializing as empty array"
                );
                creds.preKeys = [];
            }

            if (!creds.signedIdentityKey || !creds.signedPreKey) {
                global.logger.debug(
                    {
                        hasSignedPreKey: !!creds.signedPreKey,
                        hasSignedIdentityKey: !!creds.signedIdentityKey,
                        hasMe: !!creds.me,
                        preKeysCount: creds.preKeys?.length || 0,
                    },
                    "Some fields not yet populated (normal during initial connection)"
                );
            }

            const serializableCreds = BufferJSON.stringify(creds);

            const response = await fetchWithRetry(`${API_BASE}/set/creds`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: serializableCreds }),
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to save credentials: ${response.status} ${response.statusText}`
                );
            }
            return true;
        } catch (e) {
            global.logger.error({ err: e.message, stack: e.stack }, "saveCreds error");
            return false;
        }
    }

    const keys = {
        async get(type, ids) {
            if (!type || !Array.isArray(ids) || ids.length === 0) {
                return {};
            }

            if (initPromise) {
                await initPromise;
            }

            try {
                const parsed = {};
                const uncachedIds = [];

                for (const id of ids) {
                    const key = makeKey(type, id);
                    if (cache.has(key)) {
                        parsed[id] = cache.get(key);
                    } else {
                        uncachedIds.push(id);
                    }
                }

                if (uncachedIds.length > 0) {
                    const idChunks = chunkArray(uncachedIds, MAX_BATCH_SIZE);

                    for (const idChunk of idChunks) {
                        const fullKeys = idChunk.map((id) => makeKey(type, id));
                        const response = await fetchWithRetry(`${API_BASE}/get-many`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ keys: fullKeys }),
                        });

                        if (!response.ok) {
                            throw new Error(
                                `Failed to get keys: ${response.status} ${response.statusText}`
                            );
                        }

                        const data = await response.json();

                        for (const id of idChunk) {
                            const key = makeKey(type, id);
                            if (data[key]) {
                                try {
                                    const value = BufferJSON.parse(data[key]);
                                    parsed[id] = value;
                                    addToCache(key, value);
                                } catch (e) {
                                    global.logger.error(
                                        { err: e.message, key, type, id, stack: e.stack },
                                        "Failed to parse key"
                                    );
                                }
                            }
                        }
                    }
                }
                return parsed;
            } catch (e) {
                global.logger.error(
                    { err: e.message, type, idsCount: ids.length, stack: e.stack },
                    "keys.get error"
                );
                return {};
            }
        },

        async set(data) {
            if (!data || typeof data !== "object") {
                return;
            }

            const flatData = {};
            const keysToDelete = [];

            try {
                for (const type in data) {
                    const bucket = data[type];
                    for (const id in bucket) {
                        const key = makeKey(type, id);
                        const value = bucket[id];
                        if (value == null) {
                            keysToDelete.push(key);
                            cache.delete(key);
                        } else {
                            try {
                                flatData[key] = BufferJSON.stringify(value);
                                addToCache(key, value);
                            } catch (e) {
                                global.logger.error(
                                    { err: e.message, type, id, stack: e.stack },
                                    "Failed to stringify value, skipping"
                                );
                            }
                        }
                    }
                }

                if (Object.keys(flatData).length > 0) {
                    const dataChunks = chunkData(flatData, MAX_BATCH_SIZE);

                    for (let i = 0; i < dataChunks.length; i++) {
                        const chunk = dataChunks[i];
                        const chunkSize = Object.keys(chunk).length;

                        try {
                            const response = await fetchWithRetry(`${API_BASE}/set-many`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ data: chunk }),
                            });

                            if (!response.ok) {
                                const errorText = await response
                                    .text()
                                    .catch(() => response.statusText);
                                throw new Error(
                                    `Failed to set keys (chunk ${i + 1}/${dataChunks.length}): ${response.status} ${errorText}`
                                );
                            }
                        } catch (e) {
                            global.logger.error(
                                {
                                    err: e.message,
                                    chunk: i + 1,
                                    totalChunks: dataChunks.length,
                                    keysInChunk: chunkSize,
                                    stack: e.stack,
                                },
                                "Failed to save chunk"
                            );
                            throw e;
                        }
                    }
                }

                if (keysToDelete.length > 0) {
                    const deleteChunks = chunkArray(keysToDelete, MAX_BATCH_SIZE);

                    for (let i = 0; i < deleteChunks.length; i++) {
                        const chunk = deleteChunks[i];

                        try {
                            const response = await fetchWithRetry(`${API_BASE}/delete-many`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ keys: chunk }),
                            });

                            if (!response.ok) {
                                throw new Error(
                                    `Failed to delete keys (chunk ${i + 1}/${deleteChunks.length}): ${response.status} ${response.statusText}`
                                );
                            }
                        } catch (e) {
                            global.logger.error(
                                {
                                    err: e.message,
                                    chunk: i + 1,
                                    totalChunks: deleteChunks.length,
                                    stack: e.stack,
                                },
                                "Failed to delete chunk"
                            );
                            throw e;
                        }
                    }
                }
            } catch (e) {
                global.logger.error(
                    {
                        err: e.message,
                        setCount: Object.keys(flatData).length,
                        deleteCount: keysToDelete.length,
                        stack: e.stack,
                    },
                    "keys.set error"
                );
                throw e;
            }
        },

        async clear() {
            try {
                const response = await fetchWithRetry(`${API_BASE}/clear-all`, {
                    method: "POST",
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to clear keys: ${response.status} ${response.statusText}`
                    );
                }

                cache.clear();
            } catch (e) {
                global.logger.error({ err: e.message, stack: e.stack }, "keys.clear error");
            }
        },
    };

    async function transaction(work) {
        if (typeof work !== "function") {
            throw new Error("Transaction work must be a function");
        }

        if (initPromise) {
            await initPromise;
        }

        try {
            const result = await work();
            return result;
        } catch (e) {
            global.logger.error({ err: e.message, stack: e.stack }, "Transaction work failed");
            throw e;
        }
    }

    function isInTransaction() {
        return false;
    }

    async function flush() {
        global.logger.debug("flush requested");
    }

    async function getStats() {
        try {
            const response = await fetchWithRetry(`${API_BASE}/stats`);
            if (response.ok) {
                const stats = await response.json();
                return {
                    ...stats,
                    cacheSize: cache.size,
                    maxCacheSize: MAX_CACHE_SIZE,
                };
            }
            return null;
        } catch (e) {
            global.logger.error({ err: e.message, stack: e.stack }, "getStats error");
            return null;
        }
    }

    async function dispose() {
        isDisposed = true;
        cache.clear();
    }

    initPromise = initCreds().catch((e) => {
        global.logger.error({ err: e.message, stack: e.stack }, "Failed to initialize credentials");
        creds = ensureCredsStructure(initAuthCreds());
        initialized = true;
    });

    return {
        state: {
            get creds() {
                return creds;
            },
            keys,
            cache,
        },
        saveCreds,
        transaction,
        isInTransaction,
        flush,
        getStats,
        dispose,
        get closed() {
            return isDisposed;
        },
    };
}
