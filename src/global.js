import { join } from "path";
import { Database } from "bun:sqlite";
import { Buffer } from "node:buffer";
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

global.timestamp = { start: new Date() };

const DB_PATH = join(process.cwd(), "database/database.db");

const TYPE_NULL = 0x00;
const TYPE_BOOLEAN_TRUE = 0x01;
const TYPE_BOOLEAN_FALSE = 0x02;
const TYPE_NUMBER = 0x03;
const TYPE_STRING = 0x04;
const TYPE_OBJECT = 0x05;
const TYPE_ARRAY = 0x06;

class BinaryCodec {
    static encode(value) {
        if (value === null || value === undefined) {
            return Buffer.from([TYPE_NULL]);
        }

        const type = typeof value;

        if (type === "boolean") {
            return Buffer.from([value ? TYPE_BOOLEAN_TRUE : TYPE_BOOLEAN_FALSE]);
        }

        if (type === "number") {
            const buf = Buffer.allocUnsafe(9);
            buf[0] = TYPE_NUMBER;
            buf.writeDoubleBE(value, 1);
            return buf;
        }

        if (type === "string") {
            const strBuf = Buffer.from(value, "utf8");
            const lenBuf = Buffer.allocUnsafe(5);
            lenBuf[0] = TYPE_STRING;
            lenBuf.writeUInt32BE(strBuf.length, 1);
            return Buffer.concat([lenBuf, strBuf]);
        }

        if (Array.isArray(value)) {
            const chunks = [Buffer.allocUnsafe(5)];
            chunks[0][0] = TYPE_ARRAY;
            chunks[0].writeUInt32BE(value.length, 1);

            for (let i = 0; i < value.length; i++) {
                chunks.push(this.encode(value[i]));
            }
            return Buffer.concat(chunks);
        }

        if (type === "object") {
            const keys = Object.keys(value);
            const chunks = [Buffer.allocUnsafe(5)];
            chunks[0][0] = TYPE_OBJECT;
            chunks[0].writeUInt32BE(keys.length, 1);

            for (const key of keys) {
                const keyBuf = Buffer.from(key, "utf8");
                const keyLenBuf = Buffer.allocUnsafe(4);
                keyLenBuf.writeUInt32BE(keyBuf.length, 0);
                chunks.push(keyLenBuf, keyBuf, this.encode(value[key]));
            }
            return Buffer.concat(chunks);
        }

        return Buffer.from([TYPE_NULL]);
    }

    static decode(buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            return null;
        }

        const state = { offset: 0 };
        return this._decodeValue(buffer, state);
    }

    static _decodeValue(buf, state) {
        if (state.offset >= buf.length) return null;

        const type = buf[state.offset++];

        switch (type) {
            case TYPE_NULL:
                return null;

            case TYPE_BOOLEAN_TRUE:
                return true;

            case TYPE_BOOLEAN_FALSE:
                return false;

            case TYPE_NUMBER: {
                if (state.offset + 8 > buf.length) return null;
                const val = buf.readDoubleBE(state.offset);
                state.offset += 8;
                return val;
            }

            case TYPE_STRING: {
                if (state.offset + 4 > buf.length) return null;
                const len = buf.readUInt32BE(state.offset);
                state.offset += 4;

                if (state.offset + len > buf.length) return null;
                const str = buf.toString("utf8", state.offset, state.offset + len);
                state.offset += len;
                return str;
            }

            case TYPE_ARRAY: {
                if (state.offset + 4 > buf.length) return null;
                const len = buf.readUInt32BE(state.offset);
                state.offset += 4;

                const arr = new Array(len);
                for (let i = 0; i < len; i++) {
                    arr[i] = this._decodeValue(buf, state);
                }
                return arr;
            }

            case TYPE_OBJECT: {
                if (state.offset + 4 > buf.length) return null;
                const len = buf.readUInt32BE(state.offset);
                state.offset += 4;

                const obj = {};
                for (let i = 0; i < len; i++) {
                    if (state.offset + 4 > buf.length) return null;
                    const keyLen = buf.readUInt32BE(state.offset);
                    state.offset += 4;

                    if (state.offset + keyLen > buf.length) return null;
                    const key = buf.toString("utf8", state.offset, state.offset + keyLen);
                    state.offset += keyLen;

                    obj[key] = this._decodeValue(buf, state);
                }
                return obj;
            }

            default:
                return null;
        }
    }

    static checksum(buffer) {
        let hash = 0;
        for (let i = 0; i < buffer.length; i++) {
            hash = ((hash << 5) - hash + buffer[i]) | 0;
        }
        return hash;
    }
}

const sqlite = new Database(DB_PATH, {
    create: true,
    readwrite: true,
    strict: true,
});

sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA synchronous = NORMAL");
sqlite.exec("PRAGMA cache_size = -128000");
sqlite.exec("PRAGMA temp_store = MEMORY");
sqlite.exec("PRAGMA mmap_size = 30000000000");
sqlite.exec("PRAGMA page_size = 8192");
sqlite.exec("PRAGMA wal_autocheckpoint = 1000");

const SCHEMAS = {
    chats: {
        columns: {
            jid: "TEXT PRIMARY KEY",
            mute: "INTEGER DEFAULT 0",
            adminOnly: "INTEGER DEFAULT 0",
        },
        indices: ["CREATE INDEX IF NOT EXISTS idx_chats_jid ON chats(jid)"],
    },
    settings: {
        columns: {
            jid: "TEXT PRIMARY KEY",
            self: "INTEGER DEFAULT 0",
            gconly: "INTEGER DEFAULT 0",
            autoread: "INTEGER DEFAULT 0",
            restrict: "INTEGER DEFAULT 0",
            adReply: "INTEGER DEFAULT 0",
            noprint: "INTEGER DEFAULT 0",
            noerror: "INTEGER DEFAULT 1",
        },
        indices: ["CREATE INDEX IF NOT EXISTS idx_settings_jid ON settings(jid)"],
    },
    meta: {
        columns: {
            key: "TEXT PRIMARY KEY",
            value: "BLOB",
            checksum: "INTEGER DEFAULT 0",
        },
        indices: ["CREATE INDEX IF NOT EXISTS idx_meta_key ON meta(key)"],
    },
    binary_cache: {
        columns: {
            table_name: "TEXT",
            jid: "TEXT",
            data: "BLOB NOT NULL",
            checksum: "INTEGER NOT NULL",
            updated_at: "INTEGER DEFAULT (unixepoch())",
        },
        indices: [
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_binary_cache_unique ON binary_cache(table_name, jid)",
            "CREATE INDEX IF NOT EXISTS idx_binary_cache_updated ON binary_cache(updated_at DESC)",
        ],
    },
};

function ensureTable(tableName, schema) {
    const exists = sqlite
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName);

    const columnDefs = Object.entries(schema.columns)
        .map(([col, def]) => `${col} ${def}`)
        .join(", ");

    if (!exists) {
        sqlite.exec(`CREATE TABLE ${tableName} (${columnDefs}) STRICT`);

        if (schema.indices) {
            for (const idx of schema.indices) {
                sqlite.exec(idx);
            }
        }
    } else {
        const existingCols = sqlite
            .query(`PRAGMA table_info(${tableName})`)
            .all()
            .map((c) => c.name);

        for (const [col, def] of Object.entries(schema.columns)) {
            if (!existingCols.includes(col)) {
                try {
                    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${def}`);
                } catch (e) {
                    if (logger) {
                        logger.error(
                            { column: col, error: e.message },
                            `Failed to add column`
                        );
                    }
                }
            }
        }
    }
}

for (const [tableName, schema] of Object.entries(SCHEMAS)) {
    ensureTable(tableName, schema);
}

sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE)");
sqlite.exec("PRAGMA optimize");

const STMTS = {
    getCached: sqlite.query(
        "SELECT data, checksum FROM binary_cache WHERE table_name = ? AND jid = ?"
    ),
    setCached: sqlite.query(`
        INSERT INTO binary_cache (table_name, jid, data, checksum, updated_at)
        VALUES (?, ?, ?, ?, unixepoch())
        ON CONFLICT(table_name, jid) DO UPDATE SET
            data = excluded.data,
            checksum = excluded.checksum,
            updated_at = unixepoch()
    `),
    deleteCached: sqlite.query("DELETE FROM binary_cache WHERE table_name = ? AND jid = ?"),
    getRow: (table) => sqlite.query(`SELECT * FROM ${table} WHERE jid = ?`),
    insertRow: (table) => sqlite.query(`INSERT OR IGNORE INTO ${table} (jid) VALUES (?)`),
    updateCol: (table, col) => sqlite.query(`UPDATE ${table} SET ${col} = ? WHERE jid = ?`),
};

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.dirty = new Set();
        this.flushTimer = null;
        this._startFlushTimer();
    }

    _startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, 2000);
    }

    get(table, jid) {
        const key = `${table}:${jid}`;

        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const cached = STMTS.getCached.get(table, jid);
        if (cached) {
            const expectedChecksum = BinaryCodec.checksum(cached.data);
            if (expectedChecksum === cached.checksum) {
                const decoded = BinaryCodec.decode(cached.data);
                if (decoded) {
                    this.cache.set(key, decoded);
                    return decoded;
                }
            } else if (logger) {
                logger.warn({ table, jid }, "Cache checksum mismatch");
            }
        }

        return null;
    }

    set(table, jid, data) {
        const key = `${table}:${jid}`;
        this.cache.set(key, data);
        this.dirty.add(key);
    }

    delete(table, jid) {
        const key = `${table}:${jid}`;
        this.cache.delete(key);
        this.dirty.delete(key);

        try {
            STMTS.deleteCached.run(table, jid);
        } catch (e) {
            if (logger) {
                logger.error({ table, jid, error: e.message }, "Cache delete failed");
            }
        }
    }

    flush() {
        if (this.dirty.size === 0) return;

        const snapshot = new Set(this.dirty);
        this.dirty.clear();

        sqlite.transaction(() => {
            for (const key of snapshot) {
                const [table, jid] = key.split(":");
                const data = this.cache.get(key);

                if (!data) continue;

                try {
                    const encoded = BinaryCodec.encode(data);
                    const checksum = BinaryCodec.checksum(encoded);

                    STMTS.setCached.run(table, jid, encoded, checksum);
                } catch (e) {
                    if (logger) {
                        logger.error({ table, jid, error: e.message }, "Cache flush failed");
                    }
                }
            }
        })();
    }

    dispose() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        this.flush();
        this.cache.clear();
        this.dirty.clear();
    }
}

const cacheManager = new CacheManager();

class DataWrapper {
    constructor() {
        this.data = {
            chats: this._createProxy("chats"),
            settings: this._createProxy("settings"),
        };
    }

    _createProxy(table) {
        const getRowStmt = STMTS.getRow(table);
        const insertRowStmt = STMTS.insertRow(table);

        return new Proxy(
            {},
            {
                get: (_, jid) => {
                    if (typeof jid !== "string") return undefined;

                    let cached = cacheManager.get(table, jid);
                    if (cached) return this._createRowProxy(table, jid, cached);

                    let row = getRowStmt.get(jid);

                    if (!row) {
                        insertRowStmt.run(jid);
                        row = getRowStmt.get(jid);
                    }

                    const rowData = { ...row };
                    cacheManager.set(table, jid, rowData);

                    return this._createRowProxy(table, jid, rowData);
                },

                set: (_, jid, value) => {
                    if (typeof jid !== "string" || typeof value !== "object") {
                        return false;
                    }

                    cacheManager.set(table, jid, value);
                    return true;
                },

                has: (_, jid) => {
                    if (typeof jid !== "string") return false;

                    const cached = cacheManager.get(table, jid);
                    if (cached) return true;

                    const row = getRowStmt.get(jid);
                    return !!row;
                },

                deleteProperty: (_, jid) => {
                    if (typeof jid !== "string") return false;

                    cacheManager.delete(table, jid);

                    try {
                        sqlite.query(`DELETE FROM ${table} WHERE jid = ?`).run(jid);
                        return true;
                    } catch (e) {
                        if (logger) {
                            logger.error({ table, jid, error: e.message }, "Delete failed");
                        }
                        return false;
                    }
                },
            }
        );
    }

    _createRowProxy(table, jid, rowData) {
        return new Proxy(rowData, {
            set: (obj, prop, value) => {
                if (!Object.prototype.hasOwnProperty.call(SCHEMAS[table].columns, prop)) {
                    if (logger) {
                        logger.warn({ table, prop }, "Unknown column");
                    }
                    return false;
                }

                const normalizedValue = typeof value === "boolean" ? (value ? 1 : 0) : value;

                try {
                    const updateStmt = STMTS.updateCol(table, prop);
                    updateStmt.run(normalizedValue, jid);

                    obj[prop] = normalizedValue;
                    rowData[prop] = normalizedValue;

                    cacheManager.set(table, jid, rowData);

                    return true;
                } catch (e) {
                    if (logger) {
                        logger.error({ table, prop, error: e.message }, "Update failed");
                    }
                    return false;
                }
            },

            get: (obj, prop) => {
                if (prop === "toJSON") {
                    return () => ({ ...obj });
                }
                return obj[prop];
            },
        });
    }
}

const db = new DataWrapper();
global.db = db;
global.sqlite = sqlite;
