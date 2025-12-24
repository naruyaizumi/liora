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

const DB_PATH = join(process.cwd(), "src", "database", "database.db");
const sqlite = new Database(DB_PATH, { timeout: 5000 });

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("cache_size = -128000");
sqlite.pragma("temp_store = MEMORY");
sqlite.pragma("mmap_size = 30000000000");

function normalizeValue(val) {
    if (val === undefined) return null;
    if (typeof val === "boolean") return val ? 1 : 0;
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return val;
}

function ensureTable(tableName, schema) {
    const exists = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName);
    if (!exists) {
        sqlite.exec(`CREATE TABLE ${tableName} (${schema})`);
    } else {
        const columns = sqlite
            .prepare(`PRAGMA table_info(${tableName})`)
            .all()
            .map((c) => c.name);

        const wanted = schema
            .split(",")
            .map((x) => x.trim().split(" ")[0])
            .filter(Boolean);

        for (const col of wanted) {
            if (!columns.includes(col)) {
                try {
                    const colDef = schema
                        .split(",")
                        .map((x) => x.trim())
                        .find((x) => x.startsWith(col));

                    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colDef}`);
                    logger.info({ module: "DB" }, `Added column ${col} to ${tableName}`);
                } catch (e) {
                    logger.error(
                        { module: "DB", column: col, error: e.message },
                        `Failed to add column`
                    );
                }
            }
        }
    }
}

ensureTable(
    "chats",
    `
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
  `
);

ensureTable(
    "settings",
    `
  jid TEXT PRIMARY KEY,
  self INTEGER DEFAULT 0,
  gconly INTEGER DEFAULT 0,
  autoread INTEGER DEFAULT 0,
  adReply INTEGER DEFAULT 0,
  noprint INTEGER DEFAULT 0
  `
);

ensureTable(
    "meta",
    `
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
  `
);

sqlite.pragma("wal_checkpoint(FULL)");
sqlite.pragma("optimize");

class DataWrapper {
    constructor() {
        this.data = {
            chats: this.createProxy("chats"),
            settings: this.createProxy("settings"),
        };
    }

    createProxy(table) {
        return new Proxy(
            {},
            {
                get: (_, jid) => {
                    let row = sqlite.prepare(`SELECT * FROM ${table} WHERE jid = ?`).get(jid);
                    if (!row) {
                        sqlite.prepare(`INSERT INTO ${table} (jid) VALUES (?)`).run(jid);
                        row = sqlite.prepare(`SELECT * FROM ${table} WHERE jid = ?`).get(jid);
                    }

                    for (const k in row) {
                        try {
                            const parsed = JSON.parse(row[k]);
                            if (typeof parsed === "object") row[k] = parsed;
                        } catch {
                            //
                        }
                    }

                    return new Proxy(row, {
                        set: (obj, prop, value) => {
                            if (Object.prototype.hasOwnProperty.call(row, prop)) {
                                try {
                                    sqlite
                                        .prepare(`UPDATE ${table} SET ${prop} = ? WHERE jid = ?`)
                                        .run(normalizeValue(value), jid);

                                    obj[prop] = value;
                                    return true;
                                } catch (e) {
                                    conn.logger.error(
                                        { module: "DB", table, prop },
                                        `[DB] Update failed on ${table}.${prop}: ${e.message}`
                                    );
                                    return false;
                                }
                            }
                            logger.warn(
                                `Tried to set unknown column ${prop} on ${table}`
                            );
                            return false;
                        },
                    });
                },
            }
        );
    }
}

const db = new DataWrapper();
global.db = db;

global.dbManager = {
    close: () => {
        try {
            sqlite.close();
            logger.info("Database closed successfully");
        } catch (e) {
            logger.error({ error: e.message }, "Database close error");
            throw e;
        }
    }
};

global.timestamp = { start: new Date() };

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