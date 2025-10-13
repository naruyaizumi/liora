import { createRequire } from "module";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { platform } from "process";
import Database from "better-sqlite3";

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== "win32") {
    return rmPrefix
        ? /file:\/\/\//.test(pathURL)
            ? fileURLToPath(pathURL)
            : pathURL
        : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
    return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
    return createRequire(dir);
};

global.API = (name, path = "/", query = {}, apikeyqueryname) =>
    (name in global.config.APIs ? global.config.APIs[name] : name) +
    path +
    (query || apikeyqueryname
        ? "?" +
          new URLSearchParams(
              Object.entries({
                  ...query,
                  ...(apikeyqueryname
                      ? {
                            [apikeyqueryname]:
                                global.config.APIKeys[
                                    name in global.config.APIs ? global.config.APIs[name] : name
                                ],
                        }
                      : {}),
              })
          )
        : "");

global.timestamp = { start: new Date() };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "./database/database.db");

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
                    console.log(`[DB] Added column ${col} to ${tableName}`);
                } catch (e) {
                    console.error(`[DB] Failed to add column ${col}: ${e.message}`);
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
  detect INTEGER DEFAULT 0,
  sWelcome TEXT DEFAULT '',
  sBye TEXT DEFAULT '',

  antiLinks INTEGER DEFAULT 0,
  antiAudio INTEGER DEFAULT 0,
  antiFile INTEGER DEFAULT 0,
  antiFoto INTEGER DEFAULT 0,
  antiVideo INTEGER DEFAULT 0,
  antiSticker INTEGER DEFAULT 0,
  autoApprove INTEGER DEFAULT 0,
  antitagsw INTEGER DEFAULT 0,
  notifgempa INTEGER DEFAULT 0,
  gempaDateTime TEXT DEFAULT ''
  `
);

ensureTable(
    "settings",
    `
  jid TEXT PRIMARY KEY,
  self INTEGER DEFAULT 0,
  gconly INTEGER DEFAULT 0,
  autoread INTEGER DEFAULT 0,
  restrict INTEGER DEFAULT 0,
  cleartmp INTEGER DEFAULT 1,
  anticall INTEGER DEFAULT 0,
  adReply INTEGER DEFAULT 0,
  noprint INTEGER DEFAULT 0,
  noerror INTEGER DEFAULT 1,
  maintenance INTEGER DEFAULT 0
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
                            /* Jawa */
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
                                    console.error(
                                        `[DB] Update failed on ${table}.${prop}: ${e.message}`
                                    );
                                    return false;
                                }
                            }
                            console.warn(`[DB] Tried to set unknown column ${prop} on ${table}`);
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
global.sqlite = sqlite;

global.loading = async (m, conn, back = false) => {
    if (!back) return conn.sendPresenceUpdate("composing", m.chat);
    else return conn.sendPresenceUpdate("paused", m.chat);
};

global.dfail = (type, m, conn) => {
    const msg = {
        owner: `\`\`\`
[ACCESS DENIED]
This command is restricted to the system owner only.
Contact the administrator for permission.
\`\`\``,
        mods: `\`\`\`
[ACCESS DENIED]
Moderator privileges required to execute this command.
\`\`\``,
        group: `\`\`\`
[ACCESS DENIED]
This command can only be executed within a group context.
\`\`\``,
        admin: `\`\`\`
[ACCESS DENIED]
You must be a group administrator to perform this action.
\`\`\``,
        botAdmin: `\`\`\`
[ACCESS DENIED]
System privileges insufficient.
Grant admin access to the bot to continue.
\`\`\``,
        restrict: `\`\`\`
[ACCESS BLOCKED]
This feature is currently restricted or disabled by configuration.
\`\`\``,
    }[type];

    if (!msg) return;

    conn.sendMessage(
        m.chat,
        {
            text: msg,
            contextInfo: {
                externalAdReply: {
                    title: "ACCESS CONTROL SYSTEM",
                    body: global.config.watermark || "Liora Secure Environment",
                    mediaType: 1,
                    thumbnailUrl: "https://qu.ax/DdwBH.jpg",
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
};
