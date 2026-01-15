/**
 * @file Configuration and database initialization module
 * @module config
 * @description Core configuration manager, database setup, and utility functions
 * for Liora bot with SQLite persistence and environment-based configuration.
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
 * Validates and sanitizes URLs for security
 * @private
 * @function sanitizeUrl
 * @param {string} url - URL to sanitize
 * @param {string} fallback - Fallback URL if validation fails
 * @returns {string} Sanitized URL or fallback
 *
 * @security
 * - Requires HTTPS protocol
 * - Validates URL format
 * - Returns fallback on invalid URLs
 */
const sanitizeUrl = (url, fallback) => {
    try {
        if (!url) return fallback;
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return fallback;
        return url;
    } catch {
        return fallback;
    }
};

/**
 * Generates a secure pairing code for WhatsApp authentication
 * @private
 * @function generatePairingCode
 * @returns {string} 8-character alphanumeric code
 */
const generatePairingCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * Parses boolean values from various formats
 * @private
 * @function parseBoolean
 * @param {*} value - Value to parse
 * @param {boolean} defaultValue - Default value if parsing fails
 * @returns {boolean} Parsed boolean value
 */
const parseBoolean = (value, defaultValue) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "true") return true;
        if (lower === "false") return false;
    }
    return defaultValue;
};

/**
 * Initializes the logging system with configurable levels and formats
 * @private
 * @function initializeLogger
 * @returns {Object} Logger instance with methods for all log levels
 *
 * @features
 * - Environment-controlled log levels (LOG_LEVEL)
 * - Pretty printing vs JSON output (LOG_PRETTY)
 * - Structured logging with object support
 * - Colored terminal output (when pretty=true)
 * - Child logger creation with context bindings
 */
const initializeLogger = () => {
    if (globalThis.logger) return globalThis.logger;

    const logLevel = (Bun.env.LOG_LEVEL || "info").toLowerCase();
    const usePretty = parseBoolean(Bun.env.LOG_PRETTY, true);

    /**
     * Log level numeric values (Syslog compatible)
     * @private
     * @constant {Object}
     */
    const LEVEL_NUMBERS = {
        fatal: 60,
        error: 50,
        warn: 40,
        info: 30,
        debug: 20,
        trace: 10,
    };

    /**
     * ANSI color codes for terminal output
     * @private
     * @constant {Object}
     */
    const COLORS = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        cyan: "\x1b[36m",
        gray: "\x1b[90m",
        magenta: "\x1b[35m",
    };

    /**
     * Color mapping for log levels
     * @private
     * @constant {Object}
     */
    const LEVEL_COLORS = {
        fatal: `${COLORS.bright}${COLORS.red}`,
        error: COLORS.red,
        warn: COLORS.yellow,
        info: COLORS.green,
        debug: COLORS.cyan,
        trace: COLORS.gray,
    };

    /**
     * Display names for log levels
     * @private
     * @constant {Object}
     */
    const LEVEL_NAMES = {
        fatal: "FATAL",
        error: "ERROR",
        warn: "WARN",
        info: "INFO",
        debug: "DEBUG",
        trace: "TRACE",
    };

    // Determine current log level threshold
    const currentLevelNumber =
        logLevel === "silent" ? 100 : LEVEL_NUMBERS[logLevel] || LEVEL_NUMBERS.info;

    /**
     * Formats current time for log prefix
     * @private
     * @function formatTime
     * @returns {string} Formatted time string
     */
    const formatTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    /**
     * Formats object for pretty printing
     * @private
     * @function formatObject
     * @param {Object} obj - Object to format
     * @param {string} indent - Indentation string
     * @returns {string} Formatted object string
     */
    const formatObject = (obj, indent = "    ") => {
        const lines = [];
        for (const [key, value] of Object.entries(obj)) {
            let formattedValue = value;

            if (value === null) formattedValue = "null";
            else if (value === undefined) formattedValue = "undefined";
            else if (typeof value === "object") {
                formattedValue = Bun.inspect(value, { colors: false, depth: 1 });
            } else if (typeof value === "boolean") {
                formattedValue = value ? "true" : "false";
            } else if (typeof value === "number") {
                formattedValue = value.toString();
            }

            lines.push(`${indent}${COLORS.magenta}${key}${COLORS.reset} : ${formattedValue}`);
        }
        return lines.join("\n");
    };

    /**
     * Formats log message in pretty (human-readable) style
     * @private
     * @function formatPretty
     * @param {string} level - Log level
     * @param {Array} args - Log arguments
     * @returns {string} Formatted log string
     */
    const formatPretty = (level, args) => {
        const timeStr = `${COLORS.gray}[${formatTime()}]${COLORS.reset}`;
        const levelColor = LEVEL_COLORS[level] || COLORS.reset;
        const levelName = LEVEL_NAMES[level] || level.toUpperCase();

        let message = "";
        let objectLines = "";

        const strings = [];
        let object = null;

        // Separate string arguments from object arguments
        for (const arg of args) {
            if (typeof arg === "object" && arg !== null && !(arg instanceof Error)) {
                object = arg;
            } else {
                strings.push(String(arg));
            }
        }

        message = strings.join(" ");

        // Add object details if present
        if (object) {
            objectLines = "\n" + formatObject(object);
        }

        return `${timeStr} ${levelColor}${levelName}${COLORS.reset}: ${message}${objectLines}`;
    };

    /**
     * Formats log message in JSON style
     * @private
     * @function formatJson
     * @param {string} level - Log level
     * @param {Array} args - Log arguments
     * @returns {string} JSON-formatted log string
     */
    const formatJson = (level, args) => {
        let message = "";
        const extraFields = [];

        // Process arguments
        for (const arg of args) {
            if (typeof arg === "object" && arg !== null && !(arg instanceof Error)) {
                for (const [key, value] of Object.entries(arg)) {
                    extraFields.push(
                        `"${key}":${typeof value === "string" ? `"${value}"` : value}`
                    );
                }
            } else {
                message += String(arg) + " ";
            }
        }

        const fields = [
            `"level":${LEVEL_NUMBERS[level]}`,
            `"time":${Date.now()}`,
            `"msg":"${message.trim()}"`,
            `"pid":${process.pid}`,
            ...extraFields,
        ];

        return `{${fields.join(",")}}`;
    };

    /**
     * Core logging function with level filtering
     * @private
     * @function log
     * @param {string} level - Log level
     * @param {...*} args - Arguments to log
     */
    const log = (level, ...args) => {
        const levelNumber = LEVEL_NUMBERS[level];
        if (levelNumber === undefined || levelNumber < currentLevelNumber) return;
        if (logLevel === "silent") return;

        const logMessage = usePretty ? formatPretty(level, args) : formatJson(level, args);
        console.log(logMessage);
    };

    /**
     * Logger instance with all log level methods
     * @type {Object}
     */
    const logger = {
        fatal: (...args) => log("fatal", ...args),
        error: (...args) => log("error", ...args),
        warn: (...args) => log("warn", ...args),
        info: (...args) => log("info", ...args),
        debug: (...args) => log("debug", ...args),
        trace: (...args) => log("trace", ...args),

        /**
         * Creates a child logger with context bindings
         * @method child
         * @param {Object} bindings - Context bindings for all log messages
         * @returns {Object} Child logger instance
         */
        child: (bindings) => {
            const childLogger = {
                fatal: (...args) => log("fatal", bindings, ...args),
                error: (...args) => log("error", bindings, ...args),
                warn: (...args) => log("warn", bindings, ...args),
                info: (...args) => log("info", bindings, ...args),
                debug: (...args) => log("debug", bindings, ...args),
                trace: (...args) => log("trace", bindings, ...args),
                child: (additionalBindings) => logger.child({ ...bindings, ...additionalBindings }),
                level: logLevel,
                isLevelEnabled: (level) => {
                    const levelKey = level.toLowerCase();
                    const levelNum = LEVEL_NUMBERS[levelKey];
                    return levelNum !== undefined && levelNum >= currentLevelNumber;
                },
            };

            return childLogger;
        },

        /**
         * Checks if a log level is enabled
         * @method isLevelEnabled
         * @param {string} level - Log level to check
         * @returns {boolean} True if level is enabled
         */
        isLevelEnabled: (level) => {
            const levelKey = level.toLowerCase();
            const levelNum = LEVEL_NUMBERS[levelKey];
            return levelNum !== undefined && levelNum >= currentLevelNumber;
        },

        level: logLevel,
    };

    globalThis.logger = logger;
    return logger;
};

// Initialize global logger
const logger = initializeLogger();

/**
 * Initializes bot configuration from environment variables
 * @private
 * @function initializeConfig
 * @returns {Object} Configuration object
 *
 * @configurationSources
 * 1. Environment variables (primary)
 * 2. Default values (fallback)
 * 3. Auto-generation (pairing codes)
 */
const initializeConfig = () => {
    const ownersEnv = (Bun.env.OWNERS || "").trim();
    let owners = [];

    // Parse owners from environment
    if (ownersEnv) {
        if (ownersEnv.includes(",")) {
            // Comma-separated format
            owners = ownersEnv
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean);
        } else if (ownersEnv.startsWith("[")) {
            // JSON array format
            try {
                const parsed = JSON.parse(ownersEnv);
                if (Array.isArray(parsed)) {
                    owners = parsed.filter((o) => typeof o === "string" && o.trim());
                }
            } catch {
                logger.warn("Invalid OWNERS format, use comma-separated values");
            }
        } else {
            // Single owner format
            owners = [ownersEnv];
        }
    }

    /**
     * Bot configuration object
     * @type {Object}
     */
    const config = {
        owner: owners,
        pairingNumber: (Bun.env.PAIRING_NUMBER || "").trim(),
        pairingCode: (Bun.env.PAIRING_CODE || "").trim().toUpperCase() || generatePairingCode(),
        watermark: Bun.env.WATERMARK || "Liora",
        author: Bun.env.AUTHOR || "Naruya Izumi",
        stickpack: Bun.env.STICKPACK || "Liora",
        stickauth: Bun.env.STICKAUTH || "© Naruya Izumi",
        thumbnailUrl: sanitizeUrl(Bun.env.THUMBNAIL_URL),
    };

    // Validate pairing code format
    if (config.pairingCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(config.pairingCode)) {
        logger.warn("Invalid PAIRING_CODE format, generating new one");
        config.pairingCode = generatePairingCode();
    }

    return config;
};

// Set global configuration
global.config = initializeConfig();

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
        },
        indices: ["CREATE INDEX IF NOT EXISTS idx_chats_jid ON chats(jid)"],
    },
    settings: {
        columns: {
            jid: "TEXT PRIMARY KEY",
            self: "INTEGER DEFAULT 0",
            gconly: "INTEGER DEFAULT 0",
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
                    logger.warn({ table, prop }, "Unknown column");
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
 * Global database instance
 * @type {DataWrapper}
 */
const db = new DataWrapper();

/**
 * Global database references
 * @global
 * @property {DataWrapper} db - Database wrapper instance
 * @property {Database} sqlite - Raw SQLite database instance
 */
global.db = db;
global.sqlite = sqlite;

/**
 * Global timestamp tracking
 * @global
 * @property {Object} timestamp - Startup timestamp
 */
global.timestamp = { start: new Date() };

// Periodic cache monitoring
setInterval(() => {
    const stats = {
        chats: db.rowCaches.chats.cache.size,
        settings: db.rowCaches.settings.cache.size,
    };

    if (stats.chats > 80 || stats.settings > 40) {
        logger.debug({ stats }, "Cache size check");
    }
}, 60000);

/**
 * Sends typing indicators to simulate user activity
 * @global
 * @async
 * @function loading
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {boolean} back - Whether to show "back" typing (paused)
 * @returns {Promise<void>}
 */
global.loading = async (m, conn, back = false) => {
    if (!conn || !m || !m.chat) return;

    if (back) {
        // Simulate user finishing typing
        await conn.sendPresenceUpdate("paused", m.chat);
        await new Promise((resolve) => setTimeout(resolve, 800));
        await conn.sendPresenceUpdate("available", m.chat);
    } else {
        // Simulate user typing
        await conn.sendPresenceUpdate("composing", m.chat);
    }
};

/**
 * Failure message configurations for different error types
 * @private
 * @constant {Object}
 */
const FAILURE_MESSAGES = {
    owner: {
        title: "[ACCESS DENIED]",
        body: "This command is restricted to the system owner only.\nContact the administrator for permission.",
    },
    group: {
        title: "[ACCESS DENIED]",
        body: "This command can only be executed within a group context.",
    },
    admin: {
        title: "[ACCESS DENIED]",
        body: "You must be a group administrator to perform this action.",
    },
    botAdmin: {
        title: "[ACCESS DENIED]",
        body: "System privileges insufficient.\nGrant admin access to the bot to continue.",
    },
    restrict: {
        title: "[ACCESS BLOCKED]",
        body: "This feature is currently restricted or disabled by configuration.",
    },
};

/**
 * Global failure handler for permission errors
 * @global
 * @async
 * @function dfail
 * @param {string} type - Failure type (owner, group, admin, botAdmin, restrict)
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @returns {Promise<void>}
 */
global.dfail = async (type, m, conn) => {
    if (!type || !m || !conn || !m.chat) return;

    const failureConfig = FAILURE_MESSAGES[type];
    if (!failureConfig) return;

    const messageText = `\`\`\`\n${failureConfig.title}\n${failureConfig.body}\n\`\`\``;

    try {
        // Send with rich preview if thumbnail available
        await conn.sendMessage(
            m.chat,
            {
                text: messageText,
                contextInfo: {
                    externalAdReply: {
                        title: "ACCESS CONTROL SYSTEM",
                        body: global.config.watermark,
                        mediaType: 1,
                        thumbnailUrl: global.config.thumbnailUrl,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch {
        // Fallback to simple message
        await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
    }
};
