/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { BufferJSON, initAuthCreds } from "baileys";
import { Mutex } from "async-mutex";
import pino from "pino";

const logger = pino({
    level: "debug",
    base: { module: "AUTH SESSION" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB = path.join(__dirname, "../database/auth.db");

const signalHandlers = new Map();
let signalHandlersInitialized = false;

function initializeSignalHandlers() {
    if (signalHandlersInitialized) return;
    signalHandlersInitialized = true;
    const exitHandler = () => {
        for (const [, handler] of signalHandlers) {
            try {
                handler();
            } catch (e) {
                logger.error(e);
            }
        }
    };
    const signalHandler = (signal) => {
        exitHandler();
        process.exit(signal === "SIGINT" ? 130 : 143);
    };
    process.once("exit", exitHandler);
    process.once("SIGINT", () => signalHandler("SIGINT"));
    process.once("SIGTERM", () => signalHandler("SIGTERM"));
}

export function SQLiteAuth(dbPath = DEFAULT_DB, { attachSignals = true } = {}) {
    const instanceId = `SQLiteAuth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const db = new Database(dbPath, {
        timeout: 5000,
        fileMustExist: false,
    });

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("temp_store = MEMORY");
    db.pragma("cache_size = -131072");
    db.pragma("mmap_size = 134217728");

    db.exec(`
        CREATE TABLE IF NOT EXISTS baileys_state (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    const stmtGet = db.prepare("SELECT value FROM baileys_state WHERE key = ?");
    const stmtSet = db.prepare("INSERT OR REPLACE INTO baileys_state (key, value) VALUES (?, ?)");
    const stmtDel = db.prepare("DELETE FROM baileys_state WHERE key = ?");

    const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);
    const parse = (str) => {
        try {
            return JSON.parse(str, BufferJSON.reviver);
        } catch (e) {
            logger.error(e);
            return null;
        }
    };

    let creds;
    try {
        const existingCredsRow = stmtGet.get("creds");
        if (existingCredsRow && existingCredsRow.value) {
            const parsed = parse(existingCredsRow.value);
            creds = parsed || initAuthCreds();
        } else {
            creds = initAuthCreds();
        }
    } catch (e) {
        logger.error(e);
        creds = initAuthCreds();
    }

    const keys = {
        async get(type, ids) {
            const out = {};
            for (const id of ids) {
                const k = `${type}-${id}`;
                try {
                    const row = stmtGet.get(k);
                    if (row && row.value) {
                        const parsed = parse(row.value);
                        if (parsed !== null) {
                            out[id] = parsed;
                        }
                    }
                } catch (e) {
                    logger.error(e);
                }
            }
            return out;
        },

        async set(data) {
            const tx = db.transaction(() => {
                for (const type in data) {
                    const bucket = data[type];
                    for (const id in bucket) {
                        const v = bucket[id];
                        const k = `${type}-${id}`;
                        if (v == null) {
                            stmtDel.run(k);
                        } else {
                            stmtSet.run(k, stringify(v));
                        }
                    }
                }
            });
            try {
                tx();
            } catch (e) {
                logger.error(e);
                throw e;
            }
        },

        async clear() {
            try {
                db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            } catch (e) {
                logger.error(e);
                throw e;
            }
        },
    };

    async function saveCreds() {
        try {
            stmtSet.run("creds", stringify(creds));
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    try {
        db.prepare("SELECT COUNT(*) AS c FROM baileys_state").get();
    } catch (e) {
        logger.warn(e);
        try {
            db.exec("VACUUM");
        } catch (e) {
            logger.error(e);
        }
    }

    let closed = false;
    const cleanupMutex = new Mutex();

    const cleanup = async () => {
        return cleanupMutex.runExclusive(async () => {
            if (closed) return;
            closed = true;
            signalHandlers.delete(instanceId);
            try {
                try {
                    db.pragma("wal_checkpoint(TRUNCATE)");
                    db.pragma("optimize");
                } catch (e) {
                    logger.warn(e);
                }
                if (db.open) {
                    db.close();
                }
            } catch (e) {
                logger.error(e);
            }
        });
    };

    const instanceCleanup = () => {
        if (!closed && db.open) {
            try {
                db.pragma("wal_checkpoint(TRUNCATE)");
                db.close();
                closed = true;
            } catch (e) {
                logger.error(e);
            }
        }
    };

    if (attachSignals) {
        initializeSignalHandlers();
        signalHandlers.set(instanceId, instanceCleanup);
    }
    return {
        state: { creds, keys },
        saveCreds,
        _dispose: cleanup,
        db,
    };
}

export function SQLiteKeyStore(dbPath = DEFAULT_DB, options = {}) {
    const instanceId = `SQLiteKeyStore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cacheMax = Number(options.cacheMax ?? 5000);
    const ttlMs = Number(options.ttlMs ?? 5 * 60 * 1000);
    const flushIntervalMs = Number(options.flushIntervalMs ?? 200);
    const maxBatch = Number(options.maxBatch ?? 1000);
    const ownDb = !(options.db instanceof Database);
    const db =
        options.db instanceof Database
            ? options.db
            : new Database(dbPath, { timeout: 5000, fileMustExist: false });

    if (ownDb) {
        db.pragma("journal_mode = WAL");
        db.pragma("synchronous = NORMAL");
        db.pragma("temp_store = MEMORY");
        db.pragma("cache_size = -131072");
        db.pragma("mmap_size = 134217728");
    }

    db.exec(`
        CREATE TABLE IF NOT EXISTS baileys_state (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    const stmtGet = db.prepare("SELECT value FROM baileys_state WHERE key = ?");
    const stmtSet = db.prepare("INSERT OR REPLACE INTO baileys_state (key, value) VALUES (?, ?)");
    const stmtDel = db.prepare("DELETE FROM baileys_state WHERE key = ?");
    const makeKey = (type, id) => `${type}-${id}`;
    const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);
    const parse = (str) => {
        try {
            return JSON.parse(str, BufferJSON.reviver);
        } catch (e) {
            logger.error(
                { err: e, str: str?.substring(0, 100), context: "parse" },
                "Failed to parse JSON"
            );
            return null;
        }
    };

    const NOT_FOUND = Symbol("NOT_FOUND");
    const cache = new Map();

    function cacheGet(k) {
        try {
            const entry = cache.get(k);
            if (!entry) return NOT_FOUND;
            if (ttlMs > 0 && entry.exp && entry.exp < Date.now()) {
                cache.delete(k);
                return NOT_FOUND;
            }
            return entry.v;
        } catch (e) {
            logger.error(e);
            cache.delete(k);
            return NOT_FOUND;
        }
    }

    function cacheSet(k, v) {
        try {
            if (cache.size >= cacheMax && !cache.has(k)) {
                let removed = 0;
                const evictCount = Math.ceil(cacheMax * 0.1);
                const now = Date.now();

                if (ttlMs > 0) {
                    for (const [key, entry] of cache.entries()) {
                        if (entry.exp && entry.exp < now) {
                            cache.delete(key);
                            removed++;
                            if (removed >= evictCount) break;
                        }
                    }
                }

                if (removed < evictCount) {
                    const keysToRemove = Array.from(cache.keys()).slice(0, evictCount - removed);
                    for (const key of keysToRemove) {
                        cache.delete(key);
                    }
                }
            }
            cache.set(k, { v, exp: ttlMs > 0 ? Date.now() + ttlMs : 0 });
        } catch (e) {
            logger.error(e);
        }
    }

    function cacheDel(k) {
        cache.delete(k);
    }

    const writeBuffer = {
        upserts: new Map(),
        deletes: new Set(),
    };
    let flushTimer = null;

    function scheduleFlush() {
        if (!flushTimer && !disposed) {
            flushTimer = setTimeout(() => {
                flushTimer = null;
                void flush();
            }, flushIntervalMs);
        }
    }

    const writeMutex = new Mutex();
    const txCommit = db.transaction((upsertsArr, deletesArr) => {
        for (let i = 0; i < upsertsArr.length; i += maxBatch) {
            const slice = upsertsArr.slice(i, i + maxBatch);
            for (const [k, v] of slice) {
                stmtSet.run(k, stringify(v));
            }
        }
        for (let i = 0; i < deletesArr.length; i += maxBatch) {
            const slice = deletesArr.slice(i, i + maxBatch);
            for (const k of slice) {
                stmtDel.run(k);
            }
        }
    });

    async function flush() {
        if (disposed) return;

        await writeMutex.runExclusive(async () => {
            if (writeBuffer.upserts.size === 0 && writeBuffer.deletes.size === 0) return;
            const upsertsArr = Array.from(writeBuffer.upserts.entries());
            const deletesArr = Array.from(writeBuffer.deletes.values());
            writeBuffer.upserts.clear();
            writeBuffer.deletes.clear();
            try {
                txCommit(upsertsArr, deletesArr);
                try {
                    db.pragma("wal_checkpoint(PASSIVE)");
                } catch (e) {
                    logger.warn(e);
                }
            } catch (e) {
                logger.error(e);
                throw e;
            }
        });
    }

    const typeMutex = new Map();
    const mutexCleanupThreshold = 100;
    const mutexCleanupCount = 50;

    function getTypeMutex(type) {
        let m = typeMutex.get(type);
        if (!m) {
            m = new Mutex();
            typeMutex.set(type, m);
            if (typeMutex.size > mutexCleanupThreshold) {
                const toDelete = [];
                for (const [key, mutex] of typeMutex.entries()) {
                    if (key.startsWith("__txn__:") && !mutex.isLocked()) {
                        toDelete.push(key);
                        if (toDelete.length >= mutexCleanupCount) break;
                    }
                }
                for (const key of toDelete) {
                    typeMutex.delete(key);
                }
            }
        }
        return m;
    }

    let transactionsInProgress = 0;
    let txnCache = null;
    let txnMutations = null;

    function isInTransaction() {
        return transactionsInProgress > 0;
    }

    function deepClone(obj) {
        if (obj === null || obj === undefined) return obj;
        try {
            const serialized = stringify(obj);
            const result = parse(serialized);
            if (result === null) {
                throw new Error("Clone produced null from non-null input");
            }
            return result;
        } catch (e) {
            logger.error(e);
            return null;
        }
    }

    async function transaction(work, key = "default") {
        const txKeyMutex = getTypeMutex(`__txn__:${key}`);
        return await txKeyMutex.runExclusive(async () => {
            const isOutermost = transactionsInProgress === 0;
            transactionsInProgress += 1;

            let savedCache = null;
            let savedMutations = null;

            if (isOutermost) {
                txnCache = Object.create(null);
                txnMutations = Object.create(null);
            } else {
                try {
                    savedCache = txnCache ? deepClone(txnCache) : null;
                    savedMutations = txnMutations ? deepClone(txnMutations) : null;

                    if (txnCache && savedCache === null) {
                        throw new Error("Failed to clone transaction cache");
                    }
                    if (txnMutations && savedMutations === null) {
                        throw new Error("Failed to clone transaction mutations");
                    }
                } catch (e) {
                    logger.error(e);
                    transactionsInProgress -= 1;
                    throw e;
                }
            }

            try {
                const result = await work();
                if (isOutermost) {
                    await writeMutex.runExclusive(async () => {
                        const upserts = [];
                        const deletes = [];
                        for (const type in txnMutations) {
                            const bucket = txnMutations[type];
                            for (const id in bucket) {
                                const k = makeKey(type, id);
                                const v = bucket[id];
                                if (v == null) {
                                    deletes.push(k);
                                    cacheDel(k);
                                } else {
                                    upserts.push([k, v]);
                                    cacheSet(k, v);
                                }
                            }
                        }
                        if (upserts.length || deletes.length) {
                            try {
                                txCommit(upserts, deletes);
                                db.pragma("wal_checkpoint(PASSIVE)");
                            } catch (e) {
                                logger.error(e);
                                throw e;
                            }
                        }
                    });
                }

                return result;
            } catch (e) {
                logger.error(e);
                if (!isOutermost && savedCache !== null && savedMutations !== null) {
                    txnCache = savedCache;
                    txnMutations = savedMutations;
                }
                throw e;
            } finally {
                transactionsInProgress -= 1;
                if (isOutermost) {
                    txnCache = null;
                    txnMutations = null;
                }
            }
        });
    }

    async function get(type, ids) {
        if (isInTransaction() && txnCache) {
            const out = {};
            const missing = [];
            const bucket = (txnCache[type] ||= Object.create(null));

            for (const id of ids) {
                if (Object.prototype.hasOwnProperty.call(bucket, id)) {
                    const v = bucket[id];
                    if (v != null) out[id] = v;
                } else {
                    missing.push(id);
                }
            }

            if (missing.length) {
                const loaded = await _getMany(type, missing);
                for (const id of missing) {
                    bucket[id] = loaded[id] ?? null;
                    if (loaded[id] != null) out[id] = loaded[id];
                }
            }
            return out;
        }
        return _getMany(type, ids);
    }

    async function _getMany(type, ids) {
        const out = {};
        const missing = [];
        for (const id of ids) {
            const k = makeKey(type, id);
            const v = cacheGet(k);
            if (v !== NOT_FOUND) {
                if (v != null) {
                    out[id] = v;
                }
            } else {
                missing.push(id);
            }
        }
        if (missing.length === 0) return out;

        for (const id of missing) {
            const k = makeKey(type, id);
            try {
                const row = stmtGet.get(k);
                if (row?.value) {
                    const val = parse(row.value);
                    if (val != null) {
                        out[id] = val;
                        cacheSet(k, val);
                    } else {
                        cacheSet(k, null);
                    }
                } else {
                    cacheSet(k, null);
                }
            } catch (e) {
                logger.error(e);
            }
        }
        return out;
    }

    async function set(data) {
        if (isInTransaction() && txnCache && txnMutations) {
            for (const type in data) {
                const bucket = data[type] || {};
                const txBucket = (txnCache[type] ||= Object.create(null));
                const muBucket = (txnMutations[type] ||= Object.create(null));
                for (const id in bucket) {
                    const v = bucket[id];
                    txBucket[id] = v ?? null;
                    muBucket[id] = v ?? null;
                }
            }
            return;
        }

        let hasChange = false;
        for (const type in data) {
            const bucket = data[type] || {};
            for (const id in bucket) {
                const v = bucket[id];
                const k = makeKey(type, id);
                if (v == null) {
                    writeBuffer.deletes.add(k);
                    writeBuffer.upserts.delete(k);
                    cacheDel(k);
                    hasChange = true;
                } else {
                    writeBuffer.upserts.set(k, v);
                    writeBuffer.deletes.delete(k);
                    cacheSet(k, v);
                    hasChange = true;
                }
            }
        }
        if (hasChange) scheduleFlush();
    }

    async function clear() {
        await writeMutex.runExclusive(async () => {
            try {
                db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            } catch (e) {
                logger.error(e);
                throw e;
            }
        });
        for (const k of Array.from(cache.keys())) {
            if (k.includes("-")) cache.delete(k);
        }
        writeBuffer.upserts.clear();
        writeBuffer.deletes.clear();
    }

    let disposed = false;
    let disposePromise = null;
    const disposeMutex = new Mutex();

    async function dispose({ optimize = true } = {}) {
        if (disposed && disposePromise) return disposePromise;

        return disposeMutex.runExclusive(async () => {
            if (disposed && disposePromise) return disposePromise;
            disposed = true;
            signalHandlers.delete(instanceId);
            disposePromise = (async () => {
                if (flushTimer) {
                    clearTimeout(flushTimer);
                    flushTimer = null;
                }
                try {
                    await flush();
                    if (optimize) {
                        try {
                            db.pragma("wal_checkpoint(TRUNCATE)");
                            db.pragma("optimize");
                        } catch (e) {
                            logger.warn(e);
                        }
                    }
                    if (ownDb && db.open) {
                        db.close();
                    }
                } catch (e) {
                    logger.error(e);
                }
            })();
            await disposePromise;
            return disposePromise;
        });
    }

    const instanceCleanup = () => {
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
        if (!disposed && db.open) {
            disposed = true;
            try {
                const upsertsArr = Array.from(writeBuffer.upserts.entries());
                const deletesArr = Array.from(writeBuffer.deletes.values());
                if (upsertsArr.length || deletesArr.length) {
                    txCommit(upsertsArr, deletesArr);
                }
                db.pragma("wal_checkpoint(TRUNCATE)");
                if (ownDb) {
                    db.close();
                }
            } catch (e) {
                logger.error(e);
            }
        }
    };

    if (ownDb && (options.attachSignals ?? true)) {
        initializeSignalHandlers();
        signalHandlers.set(instanceId, instanceCleanup);
    }

    return {
        get,
        set,
        clear,
        transaction,
        isInTransaction,
        _flushNow: flush,
        _dispose: dispose,
    };
}
