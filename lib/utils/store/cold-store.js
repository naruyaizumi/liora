/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { Database } from "bun:sqlite";
import { Mutex } from "async-mutex";
import pino from "pino";
import path from "path";
import fs from "fs";
import BinarySerializer from "./binary-serializer.js";

const logger = pino({
    level: "info",
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
        this.writeBuffer = new Map();
        this.writeTimer = null;

        this._initialize();
    }

    _initialize() {
        try {
            this.db = new Database(this.dbPath, {
                create: true,
                readwrite: true,
                strict: true,
            });

            this.db.exec("PRAGMA journal_mode = WAL");
            this.db.exec("PRAGMA synchronous = NORMAL");
            this.db.exec("PRAGMA foreign_keys = ON");
            this.db.exec("PRAGMA temp_store = MEMORY");
            this.db.exec("PRAGMA cache_size = -64000");
            this.db.exec("PRAGMA busy_timeout = 10000");
            this.db.exec("PRAGMA page_size = 8192");
            this.db.exec("PRAGMA wal_autocheckpoint = 1000");

            this._createTables();
            this._prepareStatements();
            this._startWriteTimer();
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
                data BLOB NOT NULL,
                checksum INTEGER NOT NULL,
                created_at INTEGER DEFAULT (unixepoch()),
                updated_at INTEGER DEFAULT (unixepoch())
            ) STRICT;
            
            CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_chats_group ON chats(is_group, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_chats_checksum ON chats(checksum);
            
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                from_me INTEGER DEFAULT 0,
                data BLOB NOT NULL,
                checksum INTEGER NOT NULL,
                created_at INTEGER DEFAULT (unixepoch()),
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            ) STRICT;
            
            CREATE INDEX IF NOT EXISTS idx_messages_chat_time ON messages(chat_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_messages_checksum ON messages(checksum);
            
            CREATE TABLE IF NOT EXISTS metadata_cache (
                key TEXT PRIMARY KEY,
                value BLOB NOT NULL,
                checksum INTEGER NOT NULL,
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
            this.stmts.upsertChat = this.db.query(`
                INSERT INTO chats (id, name, subject, is_group, is_chats, last_message_time, data, checksum, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
                ON CONFLICT(id) DO UPDATE SET
                    name = COALESCE(excluded.name, name),
                    subject = COALESCE(excluded.subject, subject),
                    is_group = excluded.is_group,
                    is_chats = excluded.is_chats,
                    last_message_time = MAX(last_message_time, excluded.last_message_time),
                    data = excluded.data,
                    checksum = excluded.checksum,
                    updated_at = unixepoch()
            `);

            this.stmts.getChat = this.db.query("SELECT * FROM chats WHERE id = ?");
            this.stmts.getAllChats = this.db.query("SELECT * FROM chats ORDER BY updated_at DESC");

            this.stmts.ensureChat = this.db.query(`
                INSERT OR IGNORE INTO chats (id, is_group, is_chats, data, checksum)
                VALUES (?, ?, 0, ?, 0)
            `);

            this.stmts.upsertMessage = this.db.query(`
                INSERT INTO messages (id, chat_id, timestamp, from_me, data, checksum)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    data = excluded.data,
                    checksum = excluded.checksum,
                    timestamp = excluded.timestamp
            `);

            this.stmts.getMessages = this.db.query(`
                SELECT data, checksum FROM messages 
                WHERE chat_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `);

            this.stmts.deleteOldMessages = this.db.query(`
                DELETE FROM messages 
                WHERE chat_id = ? AND id NOT IN (
                    SELECT id FROM messages 
                    WHERE chat_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                )
            `);

            this.stmts.updateChatTimestamp = this.db.query(`
                UPDATE chats 
                SET last_message_time = MAX(last_message_time, ?),
                    updated_at = unixepoch()
                WHERE id = ?
            `);

            this.stmts.setMetadata = this.db.query(`
                INSERT INTO metadata_cache (key, value, checksum, expires_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    checksum = excluded.checksum,
                    expires_at = excluded.expires_at
            `);

            this.stmts.getMetadata = this.db.query(`
                SELECT value, checksum FROM metadata_cache 
                WHERE key = ? AND expires_at > unixepoch()
            `);

            this.stmts.deleteExpiredMetadata = this.db.query(
                "DELETE FROM metadata_cache WHERE expires_at <= unixepoch()"
            );

            this.stmts.updateUnreadCount = this.db.query(`
                UPDATE chats 
                SET unread_count = ?,
                    updated_at = unixepoch()
                WHERE id = ?
            `);

            this.stmts.verifyChecksum = this.db.query(`
                SELECT id, checksum FROM chats WHERE checksum != 0
            `);
        } catch (e) {
            logger.error(e.message);
            throw e;
        }
    }

    _startWriteTimer() {
        this.writeTimer = setInterval(() => {
            this._flushWriteBuffer().catch((e) => {
                logger.error(`Write buffer flush error: ${e.message}`);
            });
        }, 1000);
    }

    async _flushWriteBuffer() {
        if (this.writeBuffer.size === 0) return;

        const snapshot = new Map(this.writeBuffer);
        this.writeBuffer.clear();

        return this.mutex.runExclusive(() => {
            try {
                this._ensureNotClosed();

                this.db.transaction(() => {
                    for (const [key, operation] of snapshot) {
                        try {
                            operation();
                        } catch (e) {
                            logger.error(`Buffered write failed for ${key}: ${e.message}`);
                        }
                    }
                })();
            } catch (e) {
                logger.error(`Write buffer transaction failed: ${e.message}`);
                throw e;
            }
        });
    }

    _calculateChecksum(buffer) {
        let hash = 0;
        for (let i = 0; i < buffer.length; i++) {
            hash = ((hash << 5) - hash + buffer[i]) | 0;
        }
        return hash;
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
            const emptyData = Buffer.alloc(1);
            emptyData[0] = 0x00;
            this.stmts.ensureChat.run(chatId, isGroup, emptyData);
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
            const isGroup = chatData.id.endsWith("@g.us") ? 1 : 0;
            const isChats = chatData.isChats ? 1 : 0;
            const name = chatData.name || null;
            const subject = chatData.subject || null;
            const lastMessageTime = safeTimestamp(chatData.lastMessageTime) || 0;

            const serialized = BinarySerializer.serialize(chatData);
            const checksum = this._calculateChecksum(serialized);

            const operation = () => {
                this.stmts.upsertChat.run(
                    chatData.id,
                    name,
                    subject,
                    isGroup,
                    isChats,
                    lastMessageTime,
                    serialized,
                    checksum
                );

                if (typeof chatData.unreadCount === "number") {
                    this.stmts.updateUnreadCount.run(chatData.unreadCount, chatData.id);
                }
            };

            this.writeBuffer.set(`chat:${chatData.id}`, operation);
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
            const msgId = msg.key.id;
            const chatId = msg.key.remoteJid;

            this._ensureChat(chatId);

            const timestamp = safeTimestamp(msg.messageTimestamp);
            const fromMe = msg.key.fromMe ? 1 : 0;

            const serialized = BinarySerializer.serialize(msg);
            const checksum = this._calculateChecksum(serialized);

            const operation = () => {
                this.stmts.upsertMessage.run(msgId, chatId, timestamp, fromMe, serialized, checksum);
                this.stmts.updateChatTimestamp.run(timestamp, chatId);
            };

            this.writeBuffer.set(`msg:${msgId}`, operation);
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

                    this.db.transaction((msgs) => {
                        const chatTimestamps = new Map();

                        for (const msg of msgs) {
                            if (!msg?.key?.id || !isValidJid(msg?.key?.remoteJid)) continue;

                            try {
                                const msgId = msg.key.id;
                                const chatId = msg.key.remoteJid;

                                this._ensureChat(chatId);

                                const timestamp = safeTimestamp(msg.messageTimestamp);
                                const fromMe = msg.key.fromMe ? 1 : 0;

                                const serialized = BinarySerializer.serialize(msg);
                                const checksum = this._calculateChecksum(serialized);

                                this.stmts.upsertMessage.run(
                                    msgId,
                                    chatId,
                                    timestamp,
                                    fromMe,
                                    serialized,
                                    checksum
                                );

                                const currentMax = chatTimestamps.get(chatId) || 0;
                                chatTimestamps.set(chatId, Math.max(currentMax, timestamp));
                            } catch (e) {
                                logger.warn(e.message);
                            }
                        }

                        for (const [chatId, timestamp] of chatTimestamps) {
                            this.stmts.updateChatTimestamp.run(timestamp, chatId);
                        }
                    })(messages);
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

            const expectedChecksum = this._calculateChecksum(row.data);
            if (expectedChecksum !== row.checksum) {
                logger.error({ chatId }, "Checksum mismatch - data corrupted");
                return null;
            }

            const data = BinarySerializer.deserialize(row.data);
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
            logger.error(`getChat error: ${e.message}`);
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
                        const expectedChecksum = this._calculateChecksum(row.data);
                        if (expectedChecksum !== row.checksum) {
                            logger.warn({ chatId: row.id }, "Checksum mismatch");
                            return null;
                        }

                        const data = BinarySerializer.deserialize(row.data);
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
                    const expectedChecksum = this._calculateChecksum(row.data);
                    if (expectedChecksum !== row.checksum) {
                        logger.warn("Message checksum mismatch");
                        return acc;
                    }

                    const msg = BinarySerializer.deserialize(row.data);
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
                    this.stmts.deleteOldMessages.run(chatId, chatId, keepCount);
                    return this.db.changes;
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
                    const serialized = BinarySerializer.serialize(value);
                    const checksum = this._calculateChecksum(serialized);

                    this.stmts.setMetadata.run(key, serialized, checksum, expiresAt);
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
            if (!row) return null;

            const expectedChecksum = this._calculateChecksum(row.value);
            if (expectedChecksum !== row.checksum) {
                logger.error({ key }, "Metadata checksum mismatch");
                return null;
            }

            return BinarySerializer.deserialize(row.value);
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
                    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
                    this.db.exec("ANALYZE");
                    this.db.exec("PRAGMA optimize");
                } catch (e) {
                    logger.error(e.message);
                    throw e;
                }
            });
        } finally {
            this.operationCount--;
        }
    }

    async verifyIntegrity() {
        this._ensureNotClosed();

        try {
            const result = this.db.query("PRAGMA integrity_check").get();
            if (result.integrity_check !== "ok") {
                logger.error("Database integrity check failed");
                return false;
            }

            let corruptedCount = 0;
            const rows = this.stmts.verifyChecksum.all();

            for (const row of rows) {
                const chat = this.getChat(row.id);
                if (!chat) {
                    corruptedCount++;
                }
            }

            if (corruptedCount > 0) {
                logger.warn(`Found ${corruptedCount} corrupted records`);
            }

            return corruptedCount === 0;
        } catch (e) {
            logger.error(`Integrity check error: ${e.message}`);
            return false;
        }
    }

    getStats() {
        this._ensureNotClosed();

        try {
            const stats = this.db
                .query(
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
                bufferedWrites: this.writeBuffer.size,
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
        if (this.writeTimer) {
            clearInterval(this.writeTimer);
            this.writeTimer = null;
        }

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
            if (this.isClosed || this.isClosing) return;

            this.isClosing = true;

            try {
                if (this.writeTimer) {
                    clearInterval(this.writeTimer);
                    this.writeTimer = null;
                }

                await this._flushWriteBuffer();

                const maxWait = 5000;
                const startTime = Date.now();
                while (this.operationCount > 0 && Date.now() - startTime < maxWait) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                if (this.operationCount > 0) {
                    logger.warn({ pending: this.operationCount }, "Closing with pending operations");
                }

                this._finalizeStatements();

                if (this.db) {
                    try {
                        this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
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