/**
 * @file Database initialization and wrapper module
 * @module database/database
 * @description SQLite database setup with proxy-based access and caching
 * for Liora bot with performance optimizations.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { join } from "node:path";
import { Database } from "bun:sqlite";

/**
 * Encodes metadata values to binary format for SQLite storage
 * @private
 * @function encodeMeta
 * @param {*} value - Value to encode
 * @returns {Uint8Array|null} Encoded bytes or null
 *
 * @encoding
 * - Strings: UTF-8 encoding
 * - Numbers: 64-bit float (little-endian)
 * - Booleans: Single byte (1=true, 0=false)
 * - Objects: Bun.inspect() string representation
 * - Null/Undefined: Returns null
 */
const encodeMeta = (value) => {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
        return new TextEncoder().encode(value);
    }

    if (typeof value === "number") {
        const buffer = new Uint8Array(8);
        new DataView(buffer.buffer).setFloat64(0, value, true);
        return buffer;
    }

    if (typeof value === "boolean") {
        return new Uint8Array([value ? 1 : 0]);
    }

    if (typeof value === "object") {
        const str = Bun.inspect(value);
        return new TextEncoder().encode(str);
    }

    return null;
};

/**
 * Decodes binary data from SQLite back to JavaScript values
 * @private
 * @function decodeMeta
 * @param {Uint8Array|ArrayBuffer} bytes - Binary data to decode
 * @returns {*|null} Decoded value or null
 *
 * @decoding
 * - Attempts UTF-8 text decoding first
 * - Auto-detects numbers, booleans from text
 * - Falls back to null on failure
 */
const decodeMeta = (bytes) => {
    if (!bytes || bytes.length === 0) return null;

    if (!(bytes instanceof Uint8Array)) {
        bytes = new Uint8Array(bytes);
    }

    try {
        const text = new TextDecoder().decode(bytes);

        // Detect and convert numbers
        if (/^-?\d+\.?\d*$/.test(text)) {
            const num = parseFloat(text);
            if (!isNaN(num)) return num;
        }

        // Detect and convert booleans
        if (text === "true") return true;
        if (text === "false") return false;

        return text;
    } catch {
        return null;
    }
};

/**
 * Database file path
 * @private
 * @constant {string}
 */
const DB_PATH = join(process.cwd(), "src", "database", "database.db");

/**
 * SQLite database instance with performance optimizations
 * @private
 * @type {Database}
 */
const sqlite = new Database(DB_PATH, {
    create: true,
    readwrite: true,
});

// Performance optimizations
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA synchronous = NORMAL");
sqlite.exec("PRAGMA cache_size = -8000");
sqlite.exec("PRAGMA temp_store = MEMORY");
sqlite.exec("PRAGMA mmap_size = 268435456");
sqlite.exec("PRAGMA page_size = 4096");
sqlite.exec("PRAGMA locking_mode = NORMAL");

/**
 * Database table schemas
 * @private
 * @constant {Object}
 */
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
            noprint: "INTEGER DEFAULT 0",
        },
        indices: ["CREATE INDEX IF NOT EXISTS idx_settings_jid ON settings(jid)"],
    },
    meta: {
        columns: {
            key: "TEXT PRIMARY KEY",
            value: "BLOB",
        },
        indices: ["CREATE INDEX IF NOT EXISTS idx_meta_key ON meta(key)"],
    },
};

/**
 * Ensures a table exists with proper schema
 * @private
 * @function ensureTable
 * @param {string} tableName - Table name
 * @param {Object} schema - Table schema definition
 * @returns {void}
 */
function ensureTable(tableName, schema) {
    const exists = sqlite
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName);

    const columnDefs = Object.entries(schema.columns)
        .map(([col, def]) => `${col} ${def}`)
        .join(", ");

    if (!exists) {
        sqlite.exec(`CREATE TABLE ${tableName} (${columnDefs})`);

        // Create indices
        if (schema.indices) {
            for (const idx of schema.indices) {
                sqlite.exec(idx);
            }
        }
    } else {
        // Check for missing columns and add them
        const existingCols = sqlite
            .query(`PRAGMA table_info(${tableName})`)
            .all()
            .map((c) => c.name);

        for (const [col, def] of Object.entries(schema.columns)) {
            if (!existingCols.includes(col)) {
                sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${def}`);
            }
        }
    }
}

// Initialize all tables
for (const [tableName, schema] of Object.entries(SCHEMAS)) {
    ensureTable(tableName, schema);
}

// Optimize database after schema changes
sqlite.exec("PRAGMA optimize");

/**
 * Prepared SQL statements cache
 * @private
 * @constant {Object}
 */
const STMTS = {
    getRow: {},
    insertRow: {},
    updateCol: {},
    deleteRow: {},
};

/**
 * Tables that use JID as primary key
 * @private
 * @constant {Array<string>}
 */
const TABLES_WITH_JID = ["chats", "settings"];

// Prepare statements for JID-based tables
for (const table of TABLES_WITH_JID) {
    STMTS.getRow[table] = sqlite.query(`SELECT * FROM ${table} WHERE jid = ?`);
    STMTS.insertRow[table] = sqlite.query(`INSERT OR IGNORE INTO ${table} (jid) VALUES (?)`);
    STMTS.deleteRow[table] = sqlite.query(`DELETE FROM ${table} WHERE jid = ?`);

    // Prepare update statements for each column
    STMTS.updateCol[table] = {};
    for (const col of Object.keys(SCHEMAS[table].columns)) {
        if (col !== "jid") {
            STMTS.updateCol[table][col] = sqlite.query(
                `UPDATE ${table} SET ${col} = ? WHERE jid = ?`
            );
        }
    }
}

// Meta table statements
STMTS.meta = {
    get: sqlite.query(`SELECT value FROM meta WHERE key = ?`),
    set: sqlite.query(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`),
    delete: sqlite.query(`DELETE FROM meta WHERE key = ?`),
    getAll: sqlite.query(`SELECT * FROM meta`),
};

/**
 * LRU cache for database rows
 * @class RowCache
 * @private
 */
class RowCache {
    /**
     * Creates a new RowCache instance
     * @constructor
     * @param {number} maxSize - Maximum cache size
     */
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    /**
     * Gets a value from cache
     * @method get
     * @param {string} key - Cache key
     * @returns {*|undefined} Cached value or undefined
     */
    get(key) {
        return this.cache.get(key);
    }

    /**
     * Sets a value in cache with LRU eviction
     * @method set
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @returns {void}
     */
    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * Deletes a value from cache
     * @method delete
     * @param {string} key - Cache key to delete
     * @returns {void}
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clears all cached values
     * @method clear
     * @returns {void}
     */
    clear() {
        this.cache.clear();
    }
}

/**
 * Database wrapper with proxy-based access and caching
 * @class DataWrapper
 * @private
 */
class DataWrapper {
    constructor() {
        // Initialize row caches
        this.rowCaches = {
            chats: new RowCache(100),
            settings: new RowCache(50),
        };

        // Create proxy-based data accessors
        this.data = {
            chats: this._createProxy("chats"),
            settings: this._createProxy("settings"),
        };

        // Meta data interface
        this.meta = {
            get: (key) => {
                const result = STMTS.meta.get.get(key);
                return result ? decodeMeta(result.value) : null;
            },
            set: (key, value) => {
                const bytes = encodeMeta(value);
                if (bytes === null) return false;
                STMTS.meta.set.run(key, bytes);
                return true;
            },
            delete: (key) => {
                STMTS.meta.delete.run(key);
                return true;
            },
            getAll: () => {
                const rows = STMTS.meta.getAll.all();
                const result = {};
                for (const row of rows) {
                    result[row.key] = decodeMeta(row.value);
                }
                return result;
            },
        };
    }

    /**
     * Creates a Proxy for table access
     * @private
     * @method _createProxy
     * @param {string} table - Table name
     * @returns {Proxy} Table access proxy
     */
    _createProxy(table) {
        const cache = this.rowCaches[table];

        return new Proxy(
            {},
            {
                get: (_, jid) => {
                    if (typeof jid !== "string") return undefined;

                    const cacheKey = `${table}:${jid}`;
                    let cached = cache.get(cacheKey);
                    if (cached) return cached;

                    // Query database
                    let row = STMTS.getRow[table].get(jid);

                    // Create row if doesn't exist
                    if (!row) {
                        STMTS.insertRow[table].run(jid);
                        row = STMTS.getRow[table].get(jid);
                    }

                    // Create proxy for row access
                    const proxy = this._createRowProxy(table, jid, row);
                    cache.set(cacheKey, proxy);
                    return proxy;
                },

                has: (_, jid) => {
                    if (typeof jid !== "string") return false;
                    const row = STMTS.getRow[table].get(jid);
                    return !!row;
                },

                deleteProperty: (_, jid) => {
                    if (typeof jid !== "string") return false;
                    STMTS.deleteRow[table].run(jid);
                    cache.delete(`${table}:${jid}`);
                    return true;
                },
            }
        );
    }

    /**
     * Creates a Proxy for individual row access
     * @private
     * @method _createRowProxy
     * @param {string} table - Table name
     * @param {string} jid - JID identifier
     * @param {Object} rowData - Row data object
     * @returns {Proxy} Row access proxy
     */
    _createRowProxy(table, jid, rowData) {
        return new Proxy(rowData, {
            set: (obj, prop, value) => {
                // Validate column exists
                if (!Object.prototype.hasOwnProperty.call(SCHEMAS[table].columns, prop)) {
                    global.logger?.warn({ table, prop }, "Unknown column");
                    return false;
                }

                // Normalize boolean values
                const normalizedValue = typeof value === "boolean" ? (value ? 1 : 0) : value;

                // Update database
                const stmt = STMTS.updateCol[table][prop];
                if (stmt) {
                    stmt.run(normalizedValue, jid);
                    obj[prop] = normalizedValue;
                    return true;
                }

                return false;
            },

            get: (obj, prop) => {
                if (prop === "toJSON") {
                    return () => ({ ...obj });
                }
                return obj[prop];
            },
        });
    }

    /**
     * Clears specified cache or all caches
     * @method clearCache
     * @param {string} [table] - Specific table cache to clear
     * @returns {void}
     */
    clearCache(table) {
        if (table) {
            this.rowCaches[table]?.clear();
        } else {
            for (const cache of Object.values(this.rowCaches)) {
                cache.clear();
            }
        }
    }

    /**
     * Closes the data wrapper and clears caches
     * @method close
     * @returns {void}
     */
    close() {
        this.clearCache();
    }
}

/**
 * Database instance
 * @type {DataWrapper}
 */
const db = new DataWrapper();

/**
 * Exports
 */
export { db, sqlite };

// Periodic cache monitoring
setInterval(() => {
    const stats = {
        chats: db.rowCaches.chats.cache.size,
        settings: db.rowCaches.settings.cache.size,
    };

    if (stats.chats > 80 || stats.settings > 40) {
        global.logger?.debug({ stats }, "Cache size check");
    }
}, 60000);