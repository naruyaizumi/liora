/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Node.js and Baileys.
 *
 * @owner       Naruya Izumi <https://linkbio.co/naruyaizumi>
 * @copyright   © 2024 - 2025 Naruya Izumi
 * @license     Apache License 2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * IMPORTANT NOTICE:
 * - Do not sell or redistribute this source code for commercial purposes.
 * - Do not remove or alter original credits under any circumstances.
 */

import "dotenv/config";
import pino from "pino";
import { join } from "path";
import Database from "better-sqlite3";

const PRESENCE_DELAY = 800;
const DEFAULT_THUMBNAIL = "https://qu.ax/DdwBH.jpg";

const safeJSONParse = (jsonString, fallback) => {
    try {
        if (!jsonString || jsonString.trim() === "") return fallback;
        const parsed = JSON.parse(jsonString);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

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

const parseBoolean = (value, fallback = false) => {
    if (typeof value !== "string") return fallback;
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

const generatePairingCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

const initializeLogger = () => {
    if (global.logger) return global.logger;

    const logLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
    const usePretty = parseBoolean(process.env.LOG_PRETTY, true);
    const colorize = parseBoolean(process.env.LOG_COLORIZE, true);
    const timeFormat = process.env.LOG_TIME_FORMAT || "HH:MM";
    const ignore = process.env.LOG_IGNORE || "pid,hostname";

    global.logger = pino(
        { level: logLevel },
        usePretty
            ? pino.transport({
                  target: "pino-pretty",
                  options: {
                      colorize,
                      translateTime: timeFormat,
                      ignore,
                  },
              })
            : undefined
    );

    return global.logger;
};

const logger = initializeLogger();

const initializeConfig = () => {
    const owners = safeJSONParse(process.env.OWNERS, []);
    
    if (!Array.isArray(owners)) {
        logger.warn("OWNERS must be a valid JSON array");
    }

    const config = {
        owner: Array.isArray(owners)
            ? owners.filter((owner) => typeof owner === "string" && owner.trim() !== "")
            : [],
        pairingNumber: (process.env.PAIRING_NUMBER || "").trim(),
        pairingCode:
            (process.env.PAIRING_CODE || "").trim().toUpperCase() || generatePairingCode(),
        watermark: (process.env.WATERMARK || "Liora").trim(),
        author: (process.env.AUTHOR || "Naruya Izumi").trim(),
        stickpack: (process.env.STICKPACK || "Liora").trim(),
        stickauth: (process.env.STICKAUTH || "© Naruya Izumi").trim(),
        thumbnailUrl: sanitizeUrl(process.env.THUMBNAIL_URL, DEFAULT_THUMBNAIL),
    };

    if (config.pairingCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(config.pairingCode)) {
        logger.warn("Invalid PAIRING_CODE format, generating new one");
        config.pairingCode = generatePairingCode();
    }

    return config;
};

global.config = initializeConfig();

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

const DB_PATH = join(process.cwd(), "src", "database", "database.db");

class DatabaseManager {
    constructor(dbPath) {
        this.db = new Database(dbPath, { timeout: 5000 });
        this._initPragmas();
        this._initTables();
        this._initStatements();
    }

    _initPragmas() {
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this.db.pragma("cache_size = -64000"); // 64MB
        this.db.pragma("temp_store = MEMORY");
        this.db.pragma("mmap_size = 134217728"); // 128MB
    }

    _initTables() {
        // Chats table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chats (
                jid TEXT PRIMARY KEY,
                mute INTEGER DEFAULT 0,
                adminOnly INTEGER DEFAULT 0,
                antiLinks INTEGER DEFAULT 0,
                antiAudio INTEGER DEFAULT 0,
                antiFile INTEGER DEFAULT 0,
                antiFoto INTEGER DEFAULT 0,
                antiVideo INTEGER DEFAULT 0,
                antiSticker INTEGER DEFAULT 0,
                antiStatus INTEGER DEFAULT 0
            )
        `);

        // Settings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                jid TEXT PRIMARY KEY,
                self INTEGER DEFAULT 0,
                gconly INTEGER DEFAULT 0,
                autoread INTEGER DEFAULT 0,
                adReply INTEGER DEFAULT 0,
                noprint INTEGER DEFAULT 0
            )
        `);

        // Meta table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value TEXT DEFAULT ''
            )
        `);

        logger.info("Database tables initialized");
    }

    _initStatements() {
        // Prepared statements for chats
        this.stmtGetChat = this.db.prepare("SELECT * FROM chats WHERE jid = ?");
        this.stmtInsertChat = this.db.prepare("INSERT OR IGNORE INTO chats (jid) VALUES (?)");
        this.stmtUpdateChat = this.db.prepare("UPDATE chats SET [key] = ? WHERE jid = ?");

        // Prepared statements for settings
        this.stmtGetSettings = this.db.prepare("SELECT * FROM settings WHERE jid = ?");
        this.stmtInsertSettings = this.db.prepare("INSERT OR IGNORE INTO settings (jid) VALUES (?)");
        this.stmtUpdateSettings = this.db.prepare("UPDATE settings SET [key] = ? WHERE jid = ?");
    }

    getChat(jid) {
        let row = this.stmtGetChat.get(jid);
        if (!row) {
            this.stmtInsertChat.run(jid);
            row = this.stmtGetChat.get(jid);
        }
        return row;
    }

    updateChat(jid, key, value) {
        const normalized = this._normalizeValue(value);
        const stmt = this.db.prepare(`UPDATE chats SET ${key} = ? WHERE jid = ?`);
        stmt.run(normalized, jid);
    }

    getSettings(jid) {
        let row = this.stmtGetSettings.get(jid);
        if (!row) {
            this.stmtInsertSettings.run(jid);
            row = this.stmtGetSettings.get(jid);
        }
        return row;
    }

    updateSettings(jid, key, value) {
        const normalized = this._normalizeValue(value);
        const stmt = this.db.prepare(`UPDATE settings SET ${key} = ? WHERE jid = ?`);
        stmt.run(normalized, jid);
    }

    _normalizeValue(val) {
        if (val === undefined || val === null) return null;
        if (typeof val === "boolean") return val ? 1 : 0;
        if (typeof val === "object") return JSON.stringify(val);
        return val;
    }

    _parseValue(val) {
        if (val === null || val === undefined) return val;
        
        // Try to parse JSON
        if (typeof val === "string") {
            try {
                const parsed = JSON.parse(val);
                if (typeof parsed === "object") return parsed;
            } catch {
                // Not JSON, return as-is
            }
        }
        
        return val;
    }

    close() {
        try {
            this.db.pragma("wal_checkpoint(TRUNCATE)");
            this.db.pragma("optimize");
            this.db.close();
            logger.info("Database closed");
        } catch (e) {
            logger.error(`Database close error: ${e.message}`);
        }
    }
}

const dbManager = new DatabaseManager(DB_PATH);

// Create proxy-based data access
class DataProxy {
    constructor(manager, table, getMethods, updateMethod) {
        this.manager = manager;
        this.table = table;
        this.getMethods = getMethods;
        this.updateMethod = updateMethod;
        this.cache = new Map();
    }

    get(jid) {
        // Check cache first
        if (this.cache.has(jid)) {
            return this.cache.get(jid);
        }

        // Get from database
        const row = this.getMethods(jid);
        
        // Parse all values
        const parsed = {};
        for (const key in row) {
            parsed[key] = this.manager._parseValue(row[key]);
        }

        // Create proxy for this row
        const proxy = new Proxy(parsed, {
            set: (obj, prop, value) => {
                if (Object.prototype.hasOwnProperty.call(parsed, prop)) {
                    try {
                        this.updateMethod(jid, prop, value);
                        obj[prop] = value;
                        return true;
                    } catch (e) {
                        logger.error(`Failed to update ${this.table}.${prop}: ${e.message}`);
                        return false;
                    }
                }
                logger.warn(`Unknown column ${prop} on ${this.table}`);
                return false;
            }
        });

        // Cache the proxy
        this.cache.set(jid, proxy);
        return proxy;
    }

    clearCache(jid) {
        if (jid) {
            this.cache.delete(jid);
        } else {
            this.cache.clear();
        }
    }
}

// Initialize data proxies
const chatsProxy = new DataProxy(
    dbManager,
    "chats",
    (jid) => dbManager.getChat(jid),
    (jid, key, value) => dbManager.updateChat(jid, key, value)
);

const settingsProxy = new DataProxy(
    dbManager,
    "settings",
    (jid) => dbManager.getSettings(jid),
    (jid, key, value) => dbManager.updateSettings(jid, key, value)
);

// Create main proxy handler
const dataHandler = {
    get(target, table) {
        if (table === "chats") return new Proxy({}, {
            get: (_, jid) => chatsProxy.get(jid)
        });
        
        if (table === "settings") return new Proxy({}, {
            get: (_, jid) => settingsProxy.get(jid)
        });
        
        return undefined;
    }
};

// Export database
global.db = new Proxy({}, dataHandler);
global.sqlite = dbManager.db;
global.dbManager = dbManager;

// Timestamp
global.timestamp = { start: new Date() };

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

global.sendDenied = async (conn, m) => {
    const safe = async (fn, fallback = undefined) => {
        try {
            return await fn();
        } catch {
            return fallback;
        }
    };
    
    const userName = await safe(() => conn.getName(m.sender), "unknown");
    
    return conn.sendMessage(
        m.chat,
        {
            text: [
                `┌─[ACCESS DENIED]────────────`,
                `│  Private chat is currently disabled.`,
                "└────────────────────────────",
                `User   : ${userName}`,
                `Action : Blocked private access`,
            ].join("\n"),
            contextInfo: {
                externalAdReply: {
                    title: "ACCESS DENIED",
                    body: global.config.watermark,
                    mediaType: 1,
                    thumbnailUrl: global.config.thumbnailUrl,
                    renderLargerThumbnail: true,
                },
            },
        }, 
        { quoted: m }
    );
};

global.loading = async (m, conn, back = false) => {
    if (!conn || !m || !m.chat) {
        return;
    }

    try {
        if (back) {
            await conn.sendPresenceUpdate("paused", m.chat);
            await new Promise((resolve) => setTimeout(resolve, PRESENCE_DELAY));
            await conn.sendPresenceUpdate("available", m.chat);
        } else {
            await conn.sendPresenceUpdate("composing", m.chat);
        }
    } catch {
        /* silent */
    }
};

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

global.dfail = async (type, m, conn) => {
    if (!type || !m || !conn || !m.chat) return;

    const failureConfig = FAILURE_MESSAGES[type];
    if (!failureConfig) return;

    const messageText = `\`\`\`\n${failureConfig.title}\n${failureConfig.body}\n\`\`\``;

    try {
        await conn.sendMessage(
            m.chat,
            {
                text: messageText,
                contextInfo: global.config.adReply
                    ? {
                          externalAdReply: {
                              title: "ACCESS CONTROL SYSTEM",
                              body: global.config.watermark,
                              mediaType: 1,
                              thumbnailUrl: global.config.thumbnailUrl,
                              renderLargerThumbnail: true,
                          },
                      }
                    : undefined,
            },
            { quoted: m }
        );
    } catch {
        try {
            await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
        } catch {
            /* silent */
        }
    }
};