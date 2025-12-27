import "dotenv/config";
import pino from "pino";
import { join } from "path";
import { DatabaseSync } from "node:sqlite";

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

    global.logger = pino(
        { level: logLevel },
        usePretty
            ? pino.transport({
                  target: "pino-pretty",
                  options: {
                      colorize: true,
                      translateTime: "HH:MM",
                      ignore: "pid,hostname",
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
        pairingCode: (process.env.PAIRING_CODE || "").trim().toUpperCase() || generatePairingCode(),
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
const sqlite = new DatabaseSync(DB_PATH, { open: true });

sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA synchronous = NORMAL");
sqlite.exec("PRAGMA cache_size = -131072");
sqlite.exec("PRAGMA temp_store = MEMORY");
sqlite.exec("PRAGMA mmap_size = 268435456");
sqlite.exec("PRAGMA page_size = 4096");
sqlite.exec("PRAGMA auto_vacuum = INCREMENTAL");
sqlite.exec("PRAGMA busy_timeout = 5000");
sqlite.exec("PRAGMA wal_autocheckpoint = 1000");

function normalizeValue(val) {
    if (val === undefined) return null;
    if (typeof val === "boolean") return val ? 1 : 0;
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return val;
}

function ensureTable(tableName, schema) {
    const checkStmt = sqlite.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    );
    const exists = checkStmt.get(tableName);

    if (!exists) {
        sqlite.exec(`CREATE TABLE ${tableName} (${schema}) WITHOUT ROWID`);
    } else {
        const pragmaStmt = sqlite.prepare(`PRAGMA table_info(${tableName})`);
        const columns = pragmaStmt.all().map((c) => c.name);

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
                } catch {
                    //
                }
            }
        }
    }
}

ensureTable(
    "chats",
    `jid TEXT PRIMARY KEY NOT NULL,
     mute INTEGER DEFAULT 0,
     adminOnly INTEGER DEFAULT 0,
     antiLinks INTEGER DEFAULT 0,
     antiAudio INTEGER DEFAULT 0,
     antiFile INTEGER DEFAULT 0,
     antiFoto INTEGER DEFAULT 0,
     antiVideo INTEGER DEFAULT 0,
     antiSticker INTEGER DEFAULT 0,
     antiStatus INTEGER DEFAULT 0`
);

ensureTable(
    "settings",
    `jid TEXT PRIMARY KEY NOT NULL,
     self INTEGER DEFAULT 0,
     gconly INTEGER DEFAULT 0,
     autoread INTEGER DEFAULT 0,
     adReply INTEGER DEFAULT 0,
     noprint INTEGER DEFAULT 0`
);

ensureTable("meta", `key TEXT PRIMARY KEY NOT NULL, value TEXT DEFAULT ''`);

try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_chats_mute ON chats(mute) WHERE mute = 1`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_settings_self ON settings(self) WHERE self = 1`);
} catch {
    //
}

sqlite.exec("PRAGMA wal_checkpoint(PASSIVE)");
sqlite.exec("PRAGMA optimize");

class DataWrapper {
    constructor() {
        this.stmts = {
            chats: {
                select: sqlite.prepare("SELECT * FROM chats WHERE jid = ?"),
                insert: sqlite.prepare("INSERT OR IGNORE INTO chats (jid) VALUES (?)"),
            },
            settings: {
                select: sqlite.prepare("SELECT * FROM settings WHERE jid = ?"),
                insert: sqlite.prepare("INSERT OR IGNORE INTO settings (jid) VALUES (?)"),
            },
        };

        this.updateCache = {
            chats: new Map(),
            settings: new Map(),
        };

        this.data = {
            chats: this.createProxy("chats"),
            settings: this.createProxy("settings"),
        };
    }

    getUpdateStatement(table, col) {
        const cache = this.updateCache[table];
        if (!cache.has(col)) {
            cache.set(col, sqlite.prepare(`UPDATE ${table} SET ${col} = ? WHERE jid = ?`));
        }
        return cache.get(col);
    }

    createProxy(table) {
        return new Proxy(
            {},
            {
                get: (_, jid) => {
                    let row = this.stmts[table].select.get(jid);
                    if (!row) {
                        this.stmts[table].insert.run(jid);
                        row = this.stmts[table].select.get(jid);
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
                                    const updateStmt = this.getUpdateStatement(table, prop);
                                    updateStmt.run(normalizeValue(value), jid);
                                    obj[prop] = value;
                                    return true;
                                } catch {
                                    return false;
                                }
                            }
                            return false;
                        },
                    });
                },
            }
        );
    }

    cleanup() {
        for (const table in this.updateCache) {
            this.updateCache[table].clear();
        }
        this.stmts = null;
        this.updateCache = null;
    }
}

const db = new DataWrapper();
global.db = db;

global.dbManager = {
    close: () => {
        try {
            if (db && typeof db.cleanup === "function") {
                db.cleanup();
            }
            sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE)");
            sqlite.exec("PRAGMA incremental_vacuum");
            sqlite.exec("PRAGMA optimize");
            sqlite.close();
        } catch (e) {
            logger.error({ error: e.message }, "Database close error");
            throw e;
        }
    },
};

global.timestamp = { start: new Date() };

global.loading = async (m, conn, back = false) => {
    if (!conn || !m || !m.chat) return;

    try {
        if (back) {
            await conn.sendPresenceUpdate("paused", m.chat);
            await new Promise((resolve) => setTimeout(resolve, PRESENCE_DELAY));
            await conn.sendPresenceUpdate("available", m.chat);
        } else {
            await conn.sendPresenceUpdate("composing", m.chat);
        }
    } catch {
        //
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
            //
        }
    }
};