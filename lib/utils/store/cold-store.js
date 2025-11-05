/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import Database from "better-sqlite3";
import { Mutex } from "async-mutex";
import pino from "pino";
import path from "path";
import fs from "fs";

const logger = pino({
    level: "debug",
    base: { module: "COLD-STORE" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const DB_DIR = path.join(process.cwd(), "database");
const DB_FILE = path.join(DB_DIR, "store.db");

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

function serialize(data) {
    if (data === undefined || data === null) return null;
    try {
        return JSON.stringify(data, (key, value) => {
            if (typeof value === "bigint") {
                return { type: "BigInt", value: value.toString() };
            }
            if (Buffer.isBuffer(value)) {
                return { type: "Buffer", data: Array.from(value) };
            }
            return value;
        });
    } catch (e) {
        logger.error(e.message);
        return null;
    }
}

function deserialize(data) {
    if (data === null || data === undefined) return null;
    try {
        return JSON.parse(data, (key, value) => {
            if (value && typeof value === "object") {
                if (value.type === "Buffer" && Array.isArray(value.data)) {
                    return Buffer.from(value.data);
                }
                if (value.type === "BigInt" && typeof value.value === "string") {
                    return BigInt(value.value);
                }
            }
            return value;
        });
    } catch (e) {
        logger.error(e.message);
        return null;
    }
}

function isValidJid(jid) {
    if (!jid || typeof jid !== "string") return false;
    return (
        jid.endsWith("@s.whatsapp.net") ||
        jid.endsWith("@g.us") ||
        jid.endsWith("@broadcast") ||
        jid.endsWith("@lid") ||
        jid.endsWith("@newsletter")
    );
}

function safeTimestamp(timestamp) {
    if (typeof timestamp === "bigint") {
        try {
            return Number(timestamp);
        } catch {
            return Math.floor(Date.now() / 1000);
        }
    }
    if (typeof timestamp === "number" && !isNaN(timestamp) && isFinite(timestamp)) {
        return Math.floor(timestamp);
    }
    return Math.floor(Date.now() / 1000);
}

class ColdStore {
    constructor(dbPath = DB_FILE) {
        this.dbPath = dbPath;
        this.db = null;
        this.mutex = new Mutex();
        this.stmts = {};
        this.isClosing = false;
        this.isClosed = false;
        this.operationCount = 0;

        this._initialize();
    }

    _initialize() {
        try {
            this.db = new Database(this.dbPath, {
                timeout: 10000,
                fileMustExist: false,
            });

            this.db.pragma("journal_mode = WAL");
            this.db.pragma("synchronous = NORMAL");
            this.db.pragma("foreign_keys = ON");
            this.db.pragma("temp_store = MEMORY");
            this.db.pragma("cache_size = -64000");
            this.db.pragma("busy_timeout = 10000");

            this._createTables();
            this._prepareStatements();
        } catch (e) {
            logger.fatal(e.message);
            this._cleanup();
            process.exit(1);
        }
    }

    _createTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        name TEXT,
        subject TEXT,
        is_group INTEGER DEFAULT 0,
        is_chats INTEGER DEFAULT 0,
        last_message_time INTEGER DEFAULT 0,
        unread_count INTEGER DEFAULT 0,
        data TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      ) STRICT;
      
      CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chats_is_group ON chats(is_group, updated_at DESC);
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        from_me INTEGER DEFAULT 0,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      ) STRICT;
      
      CREATE INDEX IF NOT EXISTS idx_messages_chat_time ON messages(chat_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
      
      CREATE TABLE IF NOT EXISTS metadata_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;
      
      CREATE INDEX IF NOT EXISTS idx_metadata_expires ON metadata_cache(expires_at);
      
      CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      ) STRICT;
    `);
    }

    _prepareStatements() {
        try {
            this.stmts.upsertChat = this.db.prepare(`
        INSERT INTO chats (id, name, subject, is_group, is_chats, last_message_time, data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
        ON CONFLICT(id) DO UPDATE SET
          name = COALESCE(excluded.name, name),
          subject = COALESCE(excluded.subject, subject),
          is_group = excluded.is_group,
          is_chats = excluded.is_chats,
          last_message_time = MAX(last_message_time, excluded.last_message_time),
          data = excluded.data,
          updated_at = unixepoch()
      `);

            this.stmts.getChat = this.db.prepare("SELECT * FROM chats WHERE id = ?");
            this.stmts.getAllChats = this.db.prepare(
                "SELECT * FROM chats ORDER BY updated_at DESC"
            );

            this.stmts.ensureChat = this.db.prepare(`
        INSERT OR IGNORE INTO chats (id, is_group, is_chats, data)
        VALUES (?, ?, 0, NULL)
      `);

            this.stmts.upsertMessage = this.db.prepare(`
        INSERT INTO messages (id, chat_id, timestamp, from_me, data)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          data = excluded.data,
          timestamp = excluded.timestamp
      `);

            this.stmts.getMessages = this.db.prepare(`
        SELECT data FROM messages 
        WHERE chat_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);

            this.stmts.deleteOldMessages = this.db.prepare(`
        DELETE FROM messages 
        WHERE chat_id = ? AND id NOT IN (
          SELECT id FROM messages 
          WHERE chat_id = ? 
          ORDER BY timestamp DESC 
          LIMIT ?
        )
      `);

            this.stmts.getLastMessageTime = this.db.prepare(`
        SELECT MAX(timestamp) as last_time 
        FROM messages 
        WHERE chat_id = ?
`);

            this.stmts.getMessageCount = this.db.prepare(
                "SELECT COUNT(*) as count FROM messages WHERE chat_id = ?"
            );

            this.stmts.updateChatTimestamp = this.db.prepare(`
        UPDATE chats 
        SET last_message_time = MAX(last_message_time, ?),
            updated_at = unixepoch()
        WHERE id = ?
      `);

            this.stmts.setMetadata = this.db.prepare(`
        INSERT INTO metadata_cache (key, value, expires_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          expires_at = excluded.expires_at
      `);

            this.stmts.getMetadata = this.db.prepare(`
        SELECT value FROM metadata_cache 
        WHERE key = ? AND expires_at > unixepoch()
      `);

            this.stmts.deleteExpiredMetadata = this.db.prepare(
                "DELETE FROM metadata_cache WHERE expires_at <= unixepoch()"
            );

            this.stmts.setStat = this.db.prepare(`
        INSERT INTO stats (key, value, updated_at)
        VALUES (?, ?, unixepoch())
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = unixepoch()
      `);

            this.stmts.getStat = this.db.prepare("SELECT value FROM stats WHERE key = ?");

            this.stmts.updateUnreadCount = this.db.prepare(`
        UPDATE chats 
        SET unread_count = ?,
            updated_at = unixepoch()
        WHERE id = ?
      `);
        } catch (e) {
            logger.error(e.message);
            throw e;
        }
    }

    _ensureNotClosed() {
        if (this.isClosed || this.isClosing) {
            throw new Error("Database is closed or closing");
        }
    }

    _ensureChat(chatId) {
        if (!isValidJid(chatId)) {
            throw new Error(`Invalid JID: ${chatId}`);
        }
        try {
            const isGroup = chatId.endsWith("@g.us") ? 1 : 0;
            this.stmts.ensureChat.run(chatId, isGroup);
        } catch (e) {
            logger.error(e.message);
            throw e;
        }
    }

    async upsertChat(chatData) {
        this._ensureNotClosed();

        if (!isValidJid(chatData?.id)) {
            logger.warn({ jid: chatData?.id }, "Invalid JID in upsertChat");
            return;
        }

        this.operationCount++;
        try {
            return await this.mutex.runExclusive(() => {
                try {
                    this._ensureNotClosed();

                    const isGroup = chatData.id.endsWith("@g.us") ? 1 : 0;
                    const isChats = chatData.isChats ? 1 : 0;
                    const name = chatData.name || null;
                    const subject = chatData.subject || null;
                    const lastMessageTime = safeTimestamp(chatData.lastMessageTime) || 0;

                    const { ...cleanData } = chatData;
                    const data = serialize(cleanData);

                    this.stmts.upsertChat.run(
                        chatData.id,
                        name,
                        subject,
                        isGroup,
                        isChats,
                        lastMessageTime,
                        data
                    );

                    if (typeof chatData.unreadCount === "number") {
                        this.stmts.updateUnreadCount.run(chatData.unreadCount, chatData.id);
                    }
                } catch (e) {
                    logger.error(e.message);
                    throw e;
                }
            });
        } finally {
            this.operationCount--;
        }
    }

    async upsertMessage(msg) {
        this._ensureNotClosed();

        if (!msg?.key?.id || !isValidJid(msg?.key?.remoteJid)) {
            logger.warn({ msg: msg?.key }, "Invalid message structure");
            return;
        }

        this.operationCount++;
        try {
            return await this.mutex.runExclusive(() => {
                try {
                    this._ensureNotClosed();

                    const msgId = msg.key.id;
                    const chatId = msg.key.remoteJid;

                    this._ensureChat(chatId);

                    const timestamp = safeTimestamp(msg.messageTimestamp);
                    const fromMe = msg.key.fromMe ? 1 : 0;
                    const data = serialize(msg);

                    if (!data) {
                        logger.warn({ msgId }, "Failed to serialize message");
                        return;
                    }

                    this.stmts.upsertMessage.run(msgId, chatId, timestamp, fromMe, data);
                    this.stmts.updateChatTimestamp.run(timestamp, chatId);
                } catch (e) {
                    logger.error(e.message);
                    throw e;
                }
            });
        } finally {
            this.operationCount--;
        }
    }

    async batchUpsertMessages(messages) {
        this._ensureNotClosed();

        if (!Array.isArray(messages) || messages.length === 0) return;

        this.operationCount++;
        try {
            return await this.mutex.runExclusive(() => {
                try {
                    this._ensureNotClosed();

                    const transaction = this.db.transaction((msgs) => {
                        const chatTimestamps = new Map();

                        for (const msg of msgs) {
                            if (!msg?.key?.id || !isValidJid(msg?.key?.remoteJid)) continue;

                            try {
                                const msgId = msg.key.id;
                                const chatId = msg.key.remoteJid;

                                this._ensureChat(chatId);

                                const timestamp = safeTimestamp(msg.messageTimestamp);
                                const fromMe = msg.key.fromMe ? 1 : 0;
                                const data = serialize(msg);

                                if (data) {
                                    this.stmts.upsertMessage.run(
                                        msgId,
                                        chatId,
                                        timestamp,
                                        fromMe,
                                        data
                                    );

                                    const currentMax = chatTimestamps.get(chatId) || 0;
                                    chatTimestamps.set(chatId, Math.max(currentMax, timestamp));
                                }
                            } catch (e) {
                                logger.warn(e.message);
                            }
                        }

                        for (const [chatId, timestamp] of chatTimestamps) {
                            this.stmts.updateChatTimestamp.run(timestamp, chatId);
                        }
                    });

                    transaction(messages);
                } catch (e) {
                    logger.error(e.message);
                    throw e;
                }
            });
        } finally {
            this.operationCount--;
        }
    }

    getChat(chatId) {
        this._ensureNotClosed();

        if (!isValidJid(chatId)) {
            logger.warn({ chatId }, "Invalid JID in getChat");
            return null;
        }

        try {
            const row = this.stmts.getChat.get(chatId);
            if (!row) return null;

            const data = deserialize(row.data) || {};
            return {
                id: row.id,
                name: row.name,
                subject: row.subject,
                isGroup: Boolean(row.is_group),
                isChats: Boolean(row.is_chats),
                lastMessageTime: row.last_message_time,
                unreadCount: row.unread_count,
                ...data,
            };
        } catch (e) {
            logger.error(e.message);
            return null;
        }
    }

    getAllChats() {
        this._ensureNotClosed();

        try {
            const rows = this.stmts.getAllChats.all();
            return rows
                .map((row) => {
                    try {
                        const data = deserialize(row.data) || {};
                        return {
                            id: row.id,
                            name: row.name,
                            subject: row.subject,
                            isGroup: Boolean(row.is_group),
                            isChats: Boolean(row.is_chats),
                            lastMessageTime: row.last_message_time,
                            unreadCount: row.unread_count,
                            ...data,
                        };
                    } catch (e) {
                        logger.warn(e.message);
                        return null;
                    }
                })
                .filter(Boolean);
        } catch (e) {
            logger.error(e.message);
            return [];
        }
    }

    getMessages(chatId, limit = 100) {
        this._ensureNotClosed();

        if (!isValidJid(chatId)) {
            logger.warn({ chatId }, "Invalid JID in getMessages");
            return {};
        }

        if (!Number.isInteger(limit) || limit < 1) {
            logger.warn({ limit }, "Invalid limit parameter");
            limit = 100;
        }

        try {
            const rows = this.stmts.getMessages.all(chatId, limit);
            return rows.reduce((acc, row) => {
                try {
                    const msg = deserialize(row.data);
                    if (msg?.key?.id) {
                        acc[msg.key.id] = msg;
                    }
                } catch (e) {
                    logger.warn(e.message);
                }
                return acc;
            }, {});
        } catch (e) {
            logger.error(e.message);
            return {};
        }
    }

    async cleanupOldMessages(chatId, keepCount) {
        this._ensureNotClosed();

        if (!isValidJid(chatId)) {
            logger.warn({ chatId }, "Invalid JID in cleanupOldMessages");
            return 0;
        }

        if (!Number.isInteger(keepCount) || keepCount < 0) {
            logger.warn({ keepCount }, "Invalid keepCount parameter");
            return 0;
        }

        this.operationCount++;
        try {
            return await this.mutex.runExclusive(() => {
                try {
                    this._ensureNotClosed();

                    const result = this.stmts.deleteOldMessages.run(chatId, chatId, keepCount);
                    if (result.changes > 0) {
                        // hmm...
                    }
                    return result.changes;
                } catch (e) {
                    logger.error(e.message);
                    throw e;
                }
            });
        } finally {
            this.operationCount--;
        }
    }

    async setMetadata(key, value, ttlSeconds = 300) {
        this._ensureNotClosed();

        if (!key || typeof key !== "string") {
            logger.warn({ key }, "Invalid metadata key");
            return;
        }

        if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
            logger.warn({ ttlSeconds }, "Invalid TTL");
            ttlSeconds = 300;
        }

        this.operationCount++;
        try {
            return await this.mutex.runExclusive(() => {
                try {
                    this._ensureNotClosed();

                    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
                    const data = serialize(value);
                    if (data) {
                        this.stmts.setMetadata.run(key, data, expiresAt);
                    }
                } catch (e) {
                    logger.error(e.message);
                    throw e;
                }
            });
        } finally {
            this.operationCount--;
        }
    }

    getMetadata(key) {
        this._ensureNotClosed();

        if (!key || typeof key !== "string") {
            logger.warn({ key }, "Invalid metadata key");
            return null;
        }

        try {
            const row = this.stmts.getMetadata.get(key);
            return row ? deserialize(row.value) : null;
        } catch (e) {
            logger.error(e.message);
            return null;
        }
    }

    async vacuum() {
        this._ensureNotClosed();

        this.operationCount++;
        try {
            return await this.mutex.runExclusive(() => {
                try {
                    this._ensureNotClosed();

                    this.stmts.deleteExpiredMetadata.run();
                    this.db.pragma("wal_checkpoint(TRUNCATE)");
                    this.db.exec("ANALYZE");
                } catch (e) {
                    logger.error(e.message);
                    throw e;
                }
            });
        } finally {
            this.operationCount--;
        }
    }

    getStats() {
        this._ensureNotClosed();

        try {
            const stats = this.db
                .prepare(
                    `
        SELECT 
          (SELECT COUNT(*) FROM chats) as total_chats,
          (SELECT COUNT(*) FROM chats WHERE is_group = 1) as total_groups,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM metadata_cache) as cached_metadata,
          (SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as db_size
      `
                )
                .get();

            return {
                chats: stats.total_chats,
                groups: stats.total_groups,
                messages: stats.total_messages,
                metadata: stats.cached_metadata,
                sizeBytes: stats.db_size,
                sizeMB: (stats.db_size / 1024 / 1024).toFixed(2),
                pendingOperations: this.operationCount,
            };
        } catch (e) {
            logger.error(e.message);
            return { pendingOperations: this.operationCount };
        }
    }

    _finalizeStatements() {
        const stmtKeys = Object.keys(this.stmts);
        for (const key of stmtKeys) {
            try {
                if (this.stmts[key] && typeof this.stmts[key].finalize === "function") {
                    this.stmts[key].finalize();
                }
            } catch (e) {
                logger.warn(e.message);
            }
        }
        this.stmts = {};
    }

    _cleanup() {
        this._finalizeStatements();

        if (this.db) {
            try {
                this.db.close();
            } catch (e) {
                logger.warn(e.message);
            }
            this.db = null;
        }
    }

    async close() {
        return this.mutex.runExclusive(async () => {
            if (this.isClosed || this.isClosing) {
                return;
            }

            this.isClosing = true;

            try {
                const maxWait = 5000;
                const startTime = Date.now();
                while (this.operationCount > 0 && Date.now() - startTime < maxWait) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                if (this.operationCount > 0) {
                    logger.warn(
                        { pending: this.operationCount },
                        "Closing with pending operations"
                    );
                }

                this._finalizeStatements();

                if (this.db) {
                    try {
                        this.db.pragma("wal_checkpoint(TRUNCATE)");
                    } catch (e) {
                        logger.warn(e.message);
                    }

                    this.db.close();
                    this.db = null;
                }

                this.isClosed = true;
            } catch (e) {
                logger.error(e.message);
                throw e;
            } finally {
                this.isClosing = false;
            }
        });
    }
}

export default ColdStore;
