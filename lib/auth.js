/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { BufferJSON, initAuthCreds } from "baileys";
import { Mutex } from "async-mutex";
import pino from "pino";

const logger = pino({
    level: "debug",
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

export function SQLiteAuth(dbPath = DEFAULT_DB, { attachSignals = true } = {}) {
    const db = new Database(dbPath, {
        timeout: 5000,
        fileMustExist: false,
    });

    db.pragma("journal_mode = wal");
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

    const existingCredsRow = stmtGet.get("creds");
    const creds = existingCredsRow
        ? parse(existingCredsRow.value) || initAuthCreds()
        : initAuthCreds();

    const keys = {
        async get(type, ids) {
            const out = {};
            for (const id of ids) {
                const k = `${type}-${id}`;
                try {
                    const row = stmtGet.get(k);
                    out[id] = row ? parse(row.value) : null;
                } catch (e) {
                    logger.error(`Failed to get key ${k}:`, e);
                    out[id] = null;
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
            } catch (error) {
                logger.error("Failed to set keys:", error);
                throw error;
            }
        },

        async clear() {
            try {
                db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'");
            } catch (error) {
                logger.error("Failed to clear keys:", error);
                throw error;
            }
        },
    };

    async function saveCreds() {
        try {
            stmtSet.run("creds", stringify(creds));
        } catch (error) {
            logger.error("Failed to save credentials:", error);
            throw error;
        }
    }

    try {
        db.prepare("SELECT COUNT(*) AS c FROM baileys_state").get();
    } catch {
        try {
            db.exec("VACUUM");
        } catch {
            /* ignore */
        }
    }

    let closed = false;
    const cleanupMutex = new Mutex();

    const cleanup = async () => {
        return cleanupMutex.runExclusive(() => {
            if (closed) return;
            closed = true;
            try {
                try {
                    db.pragma("wal_checkpoint(FULL)");
                    db.pragma("optimize");
                } catch {
                    /* ignore */
                }
                db.close();
            } catch (e) {
                logger.error(e);
            }
        });
    };

    if (attachSignals) {
        const exitHandler = () => {
            if (!closed && db.open) {
                try {
                    db.pragma("wal_checkpoint(FULL)");
                    db.close();
                    closed = true;
                } catch {
                    /* ignore */
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

    return { state: { creds, keys }, saveCreds, _dispose: cleanup, db };
}

export function SQLiteKeyStore(dbPath = DEFAULT_DB, options = {}) {
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
            logger.error(e);
            return null;
        }
    };

    const NOT_FOUND = Symbol("NOT_FOUND");
    const cache = new Map();

    function cacheGet(k) {
        const entry = cache.get(k);
        if (!entry) return NOT_FOUND;
        if (ttlMs > 0 && entry.exp && entry.exp < Date.now()) {
            cache.delete(k);
            return NOT_FOUND;
        }
        return entry.v;
    }

    function cacheSet(k, v) {
        if (cache.size >= cacheMax) {
            let removed = 0;
            const evictCount = Math.ceil(cacheMax * 0.1);
            const now = Date.now();

            for (const [key, entry] of cache.entries()) {
                if (ttlMs > 0 && entry.exp && entry.exp < now) {
                    cache.delete(key);
                    if (++removed >= evictCount) break;
                }
            }

            if (removed < evictCount) {
                for (const key of cache.keys()) {
                    cache.delete(key);
                    if (++removed >= evictCount) break;
                }
            }
        }
        cache.set(k, { v, exp: ttlMs > 0 ? Date.now() + ttlMs : 0 });
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
            } catch (e) {
                logger.error(e);
                throw e;
            }
            try {
                db.pragma("wal_checkpoint(TRUNCATE)");
            } catch {
                /* ignore */
            }
        });
    }

    const typeMutex = new Map();
    function getTypeMutex(type) {
        let m = typeMutex.get(type);
        if (!m) {
            m = new Mutex();
            typeMutex.set(type, m);
        }
        return m;
    }

    let transactionsInProgress = 0;
    let txnCache = null;
    let txnMutations = null;

    function isInTransaction() {
        return transactionsInProgress > 0;
    }

    async function transaction(work, key = "default") {
        const txKeyMutex = getTypeMutex(`__txn__:${key}`);
        return await txKeyMutex.runExclusive(async () => {
            const isOutermost = transactionsInProgress === 0;
            transactionsInProgress += 1;

            if (isOutermost) {
                txnCache = Object.create(null);
                txnMutations = Object.create(null);
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
                logger.error(`Failed to get key ${k}:`, e);
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
        if (disposed) return disposePromise;

        return disposeMutex.runExclusive(async () => {
            if (disposed) return;
            disposed = true;

            disposePromise = (async () => {
                if (flushTimer) {
                    clearTimeout(flushTimer);
                    flushTimer = null;
                }
                try {
                    await flush();
                    if (optimize) {
                        try {
                            db.pragma("wal_checkpoint(FULL)");
                            db.pragma("optimize");
                        } catch {
                            /* ignore */
                        }
                    }
                    if (ownDb) {
                        db.close();
                    }
                } catch (e) {
                    logger.error(e);
                }
            })();

            return disposePromise;
        });
    }

    if (ownDb && (options.attachSignals ?? true)) {
        const exitHandler = () => {
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
                    db.pragma("wal_checkpoint(FULL)");
                    db.close();
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
