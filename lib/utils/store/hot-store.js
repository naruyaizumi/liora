/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { NodeCache } from "@cacheable/node-cache";
import PQueue from "p-queue";
import pino from "pino";

const logger = pino({
    level: "info",
    base: { module: "HOT-STORE" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

class HotStore {
    constructor(coldStore, options = {}) {
        this.cold = coldStore;

        this.config = {
            maxMessagesPerChat: options.maxMessagesPerChat || 100,
            messageCleanupThreshold: options.messageCleanupThreshold || 150,
            cacheTTL: options.cacheTTL || 3600,
            metadataTTL: options.metadataTTL || 300,
            flushInterval: options.flushInterval || 5000,
            batchSize: options.batchSize || 50,
        };

        this.chatCache = new NodeCache({
            stdTTL: this.config.cacheTTL,
            checkperiod: 600,
            useClones: false,
            maxKeys: 10000,
        });

        this.metadataCache = new NodeCache({
            stdTTL: this.config.metadataTTL,
            checkperiod: 60,
            useClones: false,
            maxKeys: 1000,
        });

        this.writeQueue = new PQueue({
            concurrency: 1,
            autoStart: true,
            interval: 100,
            intervalCap: 10,
        });

        this.pendingChats = new Map();
        this.pendingMessages = new Map();

        this.metadataLocks = new Map();

        this.metadataLocksCleanupTimer = setInterval(() => {
            this._cleanupStaleLocks();
        }, 60000);

        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            writes: 0,
            reads: 0,
            errors: 0,
        };

        this.chats = this._createChatProxy();

        this.flushTimer = setInterval(() => {
            this._flushPendingWrites().catch((e) => {
                logger.error(e.message);
            });
        }, this.config.flushInterval);

        this._warmupCache();
    }

    _cleanupStaleLocks() {
        const now = Date.now();
        for (const [jid, entry] of this.metadataLocks.entries()) {
            if (now - entry.timestamp > 300000) {
                this.metadataLocks.delete(jid);
                logger.warn({ jid }, "Removed stale metadata lock");
            }
        }
    }

    _warmupCache() {
        try {
            const chats = this.cold.getAllChats();

            for (const chat of chats) {
                try {
                    const messages = this.cold.getMessages(chat.id, this.config.maxMessagesPerChat);

                    const chatData = {
                        ...chat,
                        messages: messages || {},
                    };

                    this.chatCache.set(chat.id, chatData);
                } catch (e) {
                    logger.error(e.message);
                }
            }
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
        }
    }

    _createChatProxy() {
        const target = {};

        return new Proxy(target, {
            get: (_, jid) => {
                if (typeof jid === "symbol" || typeof jid !== "string") {
                    return Reflect.get(target, jid);
                }

                if (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@g.us")) {
                    this.stats.reads++;
                    return this.getChat(jid);
                }

                return Reflect.get(target, jid);
            },

            set: (_, jid, value) => {
                if (
                    typeof jid === "string" &&
                    (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@g.us"))
                ) {
                    if (value && typeof value === "object" && value.id === jid) {
                        this.upsertChat(jid, value);
                        return true;
                    }
                }
                return Reflect.set(target, jid, value);
            },

            has: (_, jid) => {
                if (
                    typeof jid === "string" &&
                    (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@g.us"))
                ) {
                    return this.chatCache.has(jid);
                }
                return Reflect.has(target, jid);
            },

            ownKeys: () => {
                return [...this.chatCache.keys()];
            },

            getOwnPropertyDescriptor: (_, jid) => {
                if (this.chatCache.has(jid)) {
                    return {
                        value: this.getChat(jid),
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    };
                }
                return undefined;
            },
        });
    }

    getChat(jid) {
        let chat = this.chatCache.get(jid);

        if (chat) {
            this.stats.cacheHits++;
            return chat;
        }

        this.stats.cacheMisses++;

        try {
            chat = this.cold.getChat(jid);

            if (chat) {
                const messages = this.cold.getMessages(jid, this.config.maxMessagesPerChat);
                chat.messages = messages || {};

                this.chatCache.set(jid, chat);
            }

            return chat;
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
            return null;
        }
    }

    upsertChat(jid, chatData) {
        if (!jid || !chatData) return;

        try {
            if (!chatData.messages) {
                chatData.messages = {};
            }

            this.chatCache.set(jid, chatData);
            this.pendingChats.set(jid, chatData);
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
        }
    }

    upsertMessage(msg) {
        const jid = msg?.key?.remoteJid;
        if (!jid) return;

        const msgId = msg.key.id;

        try {
            let chat = this.getChat(jid);
            if (!chat) {
                chat = {
                    id: jid,
                    messages: {},
                    isGroup: jid.endsWith("@g.us"),
                };
            }

            chat.messages[msgId] = msg;

            const timestamp = msg.messageTimestamp || Math.floor(Date.now() / 1000);
            if (typeof timestamp === "bigint") {
                chat.lastMessageTime = Number(timestamp);
            } else {
                chat.lastMessageTime = timestamp;
            }

            this.chatCache.set(jid, chat);
            this.pendingMessages.set(msgId, msg);

            this._cleanupChatMessages(jid, chat);
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
        }
    }

    updateMessage(key, update) {
        const jid = key?.remoteJid;
        const msgId = key?.id;

        if (!jid || !msgId) return;

        try {
            const chat = this.getChat(jid);
            if (!chat || !chat.messages || !chat.messages[msgId]) return;

            const updatedMsg = { ...chat.messages[msgId], ...update };
            chat.messages[msgId] = updatedMsg;

            this.chatCache.set(jid, chat);
            this.pendingMessages.set(msgId, updatedMsg);
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
        }
    }

    _cleanupChatMessages(jid, chat) {
        const messageCount = Object.keys(chat.messages).length;

        if (messageCount <= this.config.messageCleanupThreshold) return;

        try {
            const sorted = Object.entries(chat.messages)
                .map(([id, msg]) => ({
                    id,
                    msg,
                    ts: msg.messageTimestamp || 0,
                }))
                .sort((a, b) => {
                    const tsA = typeof a.ts === "bigint" ? Number(a.ts) : a.ts;
                    const tsB = typeof b.ts === "bigint" ? Number(b.ts) : b.ts;
                    return tsB - tsA;
                })
                .slice(0, this.config.maxMessagesPerChat);

            chat.messages = sorted.reduce((acc, { id, msg }) => {
                acc[id] = msg;
                return acc;
            }, {});

            this.chatCache.set(jid, chat);

            this.writeQueue.add(() => {
                try {
                    if (typeof this.cold.cleanupOldMessages === "function") {
                        return this.cold.cleanupOldMessages(jid, this.config.maxMessagesPerChat);
                    }
                } catch (e) {
                    logger.error(e.message);
                }
            });
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
        }
    }

    async getCachedMetadata(jid, fetchFn) {
        if (!jid) return null;

        try {
            let metadata = this.metadataCache.get(jid);
            if (metadata) {
                return metadata;
            }

            if (typeof this.cold.getMetadata === "function") {
                metadata = this.cold.getMetadata(`metadata:${jid}`);
                if (metadata) {
                    this.metadataCache.set(jid, metadata);
                    return metadata;
                }
            }

            if (this.metadataLocks.has(jid)) {
                const lockEntry = this.metadataLocks.get(jid);
                return lockEntry.promise;
            }

            if (!fetchFn) return null;

            const fetchPromise = (async () => {
                try {
                    const result = await fetchFn();

                    if (result) {
                        this.metadataCache.set(jid, result);

                        if (typeof this.cold.setMetadata === "function") {
                            try {
                                await this.cold.setMetadata(
                                    `metadata:${jid}`,
                                    result,
                                    this.config.metadataTTL
                                );
                            } catch (e) {
                                logger.error(e.message);
                            }
                        }
                    }

                    return result;
                } catch (e) {
                    logger.error(e.message);
                    this.stats.errors++;
                    return null;
                } finally {
                    this.metadataLocks.delete(jid);
                }
            })();

            this.metadataLocks.set(jid, {
                promise: fetchPromise,
                timestamp: Date.now(),
            });

            return fetchPromise;
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
            return null;
        }
    }

    invalidateMetadata(jid) {
        try {
            this.metadataCache.del(jid);
            this.metadataLocks.delete(jid);
        } catch (e) {
            logger.error(e.message);
        }
    }

    async _flushPendingWrites() {
        const pendingChatsSnapshot = new Map(this.pendingChats);
        const pendingMessagesSnapshot = new Map(this.pendingMessages);

        this.pendingChats.clear();
        this.pendingMessages.clear();

        if (pendingChatsSnapshot.size === 0 && pendingMessagesSnapshot.size === 0) {
            return;
        }

        const chatCount = pendingChatsSnapshot.size;
        const msgCount = pendingMessagesSnapshot.size;

        try {
            if (pendingChatsSnapshot.size > 0) {
                const chats = Array.from(pendingChatsSnapshot.values());

                this.writeQueue.add(async () => {
                    for (const chat of chats) {
                        try {
                            await this.cold.upsertChat(chat);
                        } catch (e) {
                            logger.error(e.message);
                            this.stats.errors++;
                        }
                    }
                });
            }

            if (pendingMessagesSnapshot.size > 0) {
                const messages = Array.from(pendingMessagesSnapshot.values());

                for (let i = 0; i < messages.length; i += this.config.batchSize) {
                    const batch = messages.slice(i, i + this.config.batchSize);

                    this.writeQueue.add(async () => {
                        try {
                            if (typeof this.cold.batchUpsertMessages === "function") {
                                await this.cold.batchUpsertMessages(batch);
                            } else {
                                for (const msg of batch) {
                                    try {
                                        await this.cold.upsertMessage(msg);
                                    } catch (e) {
                                        logger.error(e.message);
                                    }
                                }
                            }
                        } catch (e) {
                            logger.error(e.message);
                            this.stats.errors++;
                        }
                    });
                }
            }

            this.stats.writes += chatCount + msgCount;
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
        }
    }

    async flush() {
        try {
            await this._flushPendingWrites();
            await this.writeQueue.onIdle();
        } catch (e) {
            logger.error(e.message);
            this.stats.errors++;
            throw e;
        }
    }

    async dispose() {
        try {
            if (this.flushTimer) {
                clearInterval(this.flushTimer);
                this.flushTimer = null;
            }

            if (this.metadataLocksCleanupTimer) {
                clearInterval(this.metadataLocksCleanupTimer);
                this.metadataLocksCleanupTimer = null;
            }

            await this.flush();

            if (typeof this.chatCache.flushAll === "function") {
                this.chatCache.flushAll();
            } else if (typeof this.chatCache.clear === "function") {
                this.chatCache.clear();
            }

            if (typeof this.metadataCache.flushAll === "function") {
                this.metadataCache.flushAll();
            } else if (typeof this.metadataCache.clear === "function") {
                this.metadataCache.clear();
            }

            this.metadataLocks.clear();
        } catch (e) {
            logger.error(e.message);
            throw e;
        }
    }

    getStats() {
        try {
            const chatCacheStats =
                typeof this.chatCache.getStats === "function"
                    ? this.chatCache.getStats()
                    : { keys: this.chatCache.keys().length };

            const metadataCacheStats =
                typeof this.metadataCache.getStats === "function"
                    ? this.metadataCache.getStats()
                    : { keys: this.metadataCache.keys().length };

            return {
                cache: {
                    chats: chatCacheStats,
                    metadata: metadataCacheStats,
                },
                queue: {
                    size: this.writeQueue.size,
                    pending: this.writeQueue.pending,
                },
                pending: {
                    chats: this.pendingChats.size,
                    messages: this.pendingMessages.size,
                },
                locks: {
                    metadata: this.metadataLocks.size,
                },
                stats: this.stats,
            };
        } catch (e) {
            logger.error(e.message);
            return {
                error: e.message,
                stats: this.stats,
            };
        }
    }
}

export default HotStore;
