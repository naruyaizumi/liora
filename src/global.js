/* global conn */
import { join } from "path";
import Database from "better-sqlite3";

global.timestamp = { start: new Date() };

const DB_PATH = join(process.cwd(), "database/database.db");
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
                    conn.logger.info({ module: "DB" }, `Added column ${col} to ${tableName}`);
                } catch (e) {
                    conn.logger.error(
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
                            /* Ignore parsing errors for non-JSON values */
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
                            conn.logger.warn(
                                `[DB] Tried to set unknown column ${prop} on ${table}`
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
global.sqlite = sqlite;
