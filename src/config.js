import { join } from "node:path";
import { Database } from "bun:sqlite";

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

const generatePairingCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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

const initializeLogger = () => {
  if (globalThis.logger) return globalThis.logger;

  const logLevel = (Bun.env.LOG_LEVEL || "info").toLowerCase();
  const usePretty = parseBoolean(Bun.env.LOG_PRETTY, true);

  const LEVEL_NUMBERS = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
  };

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

  const LEVEL_COLORS = {
    fatal: `${COLORS.bright}${COLORS.red}`,
    error: COLORS.red,
    warn: COLORS.yellow,
    info: COLORS.green,
    debug: COLORS.cyan,
    trace: COLORS.gray,
  };

  const LEVEL_NAMES = {
    fatal: "FATAL",
    error: "ERROR",
    warn: "WARN",
    info: "INFO",
    debug: "DEBUG",
    trace: "TRACE",
  };

  const currentLevelNumber =
    logLevel === "silent" ? 100 : LEVEL_NUMBERS[logLevel] || LEVEL_NUMBERS.info;

  const formatTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const formatObject = (obj, indent = "    ") => {
    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
      let formattedValue = value;

      if (value === null) formattedValue = "null";
      else if (value === undefined) formattedValue = "undefined";
      else if (typeof value === "object") {
        try {
          formattedValue = JSON.stringify(value);
        } catch {
          formattedValue = Bun.inspect(value, { colors: false, depth: 1 });
        }
      } else if (typeof value === "boolean") {
        formattedValue = value ? "true" : "false";
      } else if (typeof value === "number") {
        formattedValue = value.toString();
      }

      lines.push(
        `${indent}${COLORS.magenta}${key}${COLORS.reset} : ${formattedValue}`,
      );
    }
    return lines.join("\n");
  };

  const formatPretty = (level, args) => {
    const timeStr = `${COLORS.gray}[${formatTime()}]${COLORS.reset}`;
    const levelColor = LEVEL_COLORS[level] || COLORS.reset;
    const levelName = LEVEL_NAMES[level] || level.toUpperCase();

    let message = "";
    let objectLines = "";

    const strings = [];
    let object = null;

    for (const arg of args) {
      if (typeof arg === "object" && arg !== null && !(arg instanceof Error)) {
        object = arg;
      } else {
        strings.push(String(arg));
      }
    }

    message = strings.join(" ");

    if (object) {
      objectLines = "\n" + formatObject(object);
    }

    return `${timeStr} ${levelColor}${levelName}${COLORS.reset}: ${message}${objectLines}`;
  };

  const formatJson = (level, args) => {
    let message = "";
    let extraObject = {};

    const strings = [];

    for (const arg of args) {
      if (typeof arg === "object" && arg !== null && !(arg instanceof Error)) {
        extraObject = { ...extraObject, ...arg };
      } else {
        strings.push(String(arg));
      }
    }

    message = strings.join(" ");

    const logEntry = {
      level: LEVEL_NUMBERS[level],
      time: Date.now(),
      msg: message,
      pid: process.pid,
      ...extraObject,
    };

    return JSON.stringify(logEntry);
  };

  const log = (level, ...args) => {
    const levelNumber = LEVEL_NUMBERS[level];
    if (levelNumber === undefined || levelNumber < currentLevelNumber) return;
    if (logLevel === "silent") return;

    const logMessage = usePretty
      ? formatPretty(level, args)
      : formatJson(level, args);
    console.log(logMessage);
  };

  const logger = {
    fatal: (...args) => log("fatal", ...args),
    error: (...args) => log("error", ...args),
    warn: (...args) => log("warn", ...args),
    info: (...args) => log("info", ...args),
    debug: (...args) => log("debug", ...args),
    trace: (...args) => log("trace", ...args),

    child: (bindings) => {
      const childLogger = {
        fatal: (...args) => log("fatal", bindings, ...args),
        error: (...args) => log("error", bindings, ...args),
        warn: (...args) => log("warn", bindings, ...args),
        info: (...args) => log("info", bindings, ...args),
        debug: (...args) => log("debug", bindings, ...args),
        trace: (...args) => log("trace", bindings, ...args),
        child: (additionalBindings) =>
          logger.child({ ...bindings, ...additionalBindings }),
        level: logLevel,
        isLevelEnabled: (level) => {
          const levelKey = level.toLowerCase();
          const levelNum = LEVEL_NUMBERS[levelKey];
          return levelNum !== undefined && levelNum >= currentLevelNumber;
        },
      };

      return childLogger;
    },

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

const logger = initializeLogger();

export default logger;
export { initializeLogger };

const initializeConfig = () => {
  const owners = safeJSONParse(Bun.env.OWNERS, []);

  if (!Array.isArray(owners)) {
    logger.warn("OWNERS must be a valid JSON array");
  }

  const config = {
    owner: Array.isArray(owners)
      ? owners.filter(
          (owner) => typeof owner === "string" && owner.trim() !== "",
        )
      : [],
    pairingNumber: (Bun.env.PAIRING_NUMBER || "").trim(),
    pairingCode:
      (Bun.env.PAIRING_CODE || "").trim().toUpperCase() ||
      generatePairingCode(),
    watermark: (Bun.env.WATERMARK || "Liora").trim(),
    author: (Bun.env.AUTHOR || "Naruya Izumi").trim(),
    thumbnailUrl: sanitizeUrl(Bun.env.THUMBNAIL_URL, DEFAULT_THUMBNAIL),
  };

  if (
    config.pairingCode.length !== 8 ||
    !/^[A-Z0-9]{8}$/.test(config.pairingCode)
  ) {
    logger.warn("Invalid PAIRING_CODE format, generating new one");
    config.pairingCode = generatePairingCode();
  }

  return config;
};

global.config = initializeConfig();

const DB_PATH = join(process.cwd(), "src", "database", "database.db");

const sqlite = new Database(DB_PATH, {
  create: true,
  readwrite: true,
});

sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA synchronous = NORMAL");
sqlite.exec("PRAGMA cache_size = -8000");
sqlite.exec("PRAGMA temp_store = MEMORY");
sqlite.exec("PRAGMA mmap_size = 268435456");
sqlite.exec("PRAGMA page_size = 4096");
sqlite.exec("PRAGMA locking_mode = NORMAL");

const SCHEMAS = {
  chats: {
    columns: {
      jid: "TEXT PRIMARY KEY",
      mute: "INTEGER DEFAULT 0",
      adminOnly: "INTEGER DEFAULT 0",
      antiLinks: "INTEGER DEFAULT 0",
      antiAudio: "INTEGER DEFAULT 0",
      antiFile: "INTEGER DEFAULT 0",
      antiFoto: "INTEGER DEFAULT 0",
      antiVideo: "INTEGER DEFAULT 0",
      antiSticker: "INTEGER DEFAULT 0",
      antiStatus: "INTEGER DEFAULT 0",
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
    },
    indices: ["CREATE INDEX IF NOT EXISTS idx_settings_jid ON settings(jid)"],
  },
  meta: {
    columns: {
      key: "TEXT PRIMARY KEY",
      value: "TEXT",
    },
    indices: ["CREATE INDEX IF NOT EXISTS idx_meta_key ON meta(key)"],
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
    sqlite.exec(`CREATE TABLE ${tableName} (${columnDefs})`);

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
        sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${def}`);
      }
    }
  }
}

for (const [tableName, schema] of Object.entries(SCHEMAS)) {
  ensureTable(tableName, schema);
}

sqlite.exec("PRAGMA optimize");

const STMTS = {
  getRow: {},
  insertRow: {},
  updateCol: {},
  deleteRow: {},
};

const TABLES_WITH_JID = ["chats", "settings"];

for (const table of TABLES_WITH_JID) {
  STMTS.getRow[table] = sqlite.query(`SELECT * FROM ${table} WHERE jid = ?`);
  STMTS.insertRow[table] = sqlite.query(
    `INSERT OR IGNORE INTO ${table} (jid) VALUES (?)`,
  );
  STMTS.deleteRow[table] = sqlite.query(`DELETE FROM ${table} WHERE jid = ?`);

  STMTS.updateCol[table] = {};
  for (const col of Object.keys(SCHEMAS[table].columns)) {
    if (col !== "jid") {
      STMTS.updateCol[table][col] = sqlite.query(
        `UPDATE ${table} SET ${col} = ? WHERE jid = ?`,
      );
    }
  }
}

STMTS.meta = {
  get: sqlite.query(`SELECT value FROM meta WHERE key = ?`),
  set: sqlite.query(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`),
  delete: sqlite.query(`DELETE FROM meta WHERE key = ?`),
  getAll: sqlite.query(`SELECT * FROM meta`),
};

class RowCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

class DataWrapper {
  constructor() {
    this.rowCaches = {
      chats: new RowCache(100),
      settings: new RowCache(50),
    };

    this.data = {
      chats: this._createProxy("chats"),
      settings: this._createProxy("settings"),
    };

    this.meta = {
      get: (key) => {
        const result = STMTS.meta.get.get(key);
        return result ? safeJSONParse(result.value, null) : null;
      },
      set: (key, value) => {
        const strValue =
          typeof value === "object" ? JSON.stringify(value) : String(value);
        STMTS.meta.set.run(key, strValue);
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
          result[row.key] = safeJSONParse(row.value, row.value);
        }
        return result;
      },
    };
  }

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

          let row = STMTS.getRow[table].get(jid);

          if (!row) {
            STMTS.insertRow[table].run(jid);
            row = STMTS.getRow[table].get(jid);
          }

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
      },
    );
  }

  _createRowProxy(table, jid, rowData) {
    return new Proxy(rowData, {
      set: (obj, prop, value) => {
        if (
          !Object.prototype.hasOwnProperty.call(SCHEMAS[table].columns, prop)
        ) {
          logger.warn({ table, prop }, "Unknown column");
          return false;
        }

        const normalizedValue =
          typeof value === "boolean" ? (value ? 1 : 0) : value;

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

  clearCache(table) {
    if (table) {
      this.rowCaches[table]?.clear();
    } else {
      for (const cache of Object.values(this.rowCaches)) {
        cache.clear();
      }
    }
  }
}

const db = new DataWrapper();
global.db = db;

setInterval(() => {
  const stats = {
    chats: db.rowCaches.chats.cache.size,
    settings: db.rowCaches.settings.cache.size,
  };

  if (stats.chats > 80 || stats.settings > 40) {
    logger.debug({ stats }, "Cache size check");
  }
}, 60000);

global.loading = async (m, conn, back = false) => {
  if (!conn || !m || !m.chat) return;

  if (back) {
    await conn.sendPresenceUpdate("paused", m.chat);
    await new Promise((resolve) => setTimeout(resolve, PRESENCE_DELAY));
    await conn.sendPresenceUpdate("available", m.chat);
  } else {
    await conn.sendPresenceUpdate("composing", m.chat);
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
      { quoted: m },
    );
  } catch {
    await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
  }
};

process.on("SIGTERM", () => {
  sqlite.close();
});

process.on("SIGINT", () => {
  sqlite.close();
});
