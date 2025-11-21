import pino from "pino";
import { EventEmitter } from "node:events";

const logger = pino({
    level: "debug",
    base: { module: "STORE" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
        },
    },
});

class LRUCache {
    constructor(maxSize = 500, ttl = 3600000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }

    get(key) {
        if (!key) return undefined;
        const item = this.cache.get(key);

        if (!item) {
            this.stats.misses++;
            return undefined;
        }

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return undefined;
        }

        this.cache.delete(key);
        item.timestamp = Date.now();
        this.cache.set(key, item);
        this.stats.hits++;
        return item.value;
    }

    set(key, value) {
        if (!key) {
            logger.warn("Attempted to set cache with null/undefined key");
            return false;
        }

        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
        return true;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    clear() {
        const size = this.cache.size;
        this.cache.clear();
        return size;
    }

    cleanup() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.cache.delete(key);
        }

        if (keysToDelete.length > 0) {
            logger.debug(`Cleaned up ${keysToDelete.length} expired entries`);
        }

        return keysToDelete.length;
    }

    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
        };
    }

    get size() {
        return this.cache.size;
    }
}

class GroupMetadataCache extends LRUCache {
    constructor() {
        super(200, 600000);
    }
}

class MessageCache extends LRUCache {
    constructor() {
        super(1000, 1800000);
    }
}

class StoreManager extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);
        this.chatCache = new LRUCache(500, 3600000);
        this.groupMetaCache = new GroupMetadataCache();
        this.messageCache = new MessageCache();
        this.contactCache = new LRUCache(1000, 7200000);
        this.blocklistCache = new Set();
        this.pendingMetadataFetch = new Map();
        this.pendingOperations = new Map();
        this.batchQueue = [];
        this.batchTimer = null;
        this.batchDelay = 100;
        this.stats = {
            messagesProcessed: 0,
            chatsProcessed: 0,
            contactsProcessed: 0,
            errorsCount: 0,
            lastCleanup: Date.now(),
        };
        this.startPeriodicCleanup();
        this.startPendingCleanup();
    }

    getChat(id) {
        return this.chatCache.get(id);
    }

    setChat(id, data) {
        return this.chatCache.set(id, data);
    }

    getGroupMeta(id) {
        return this.groupMetaCache.get(id);
    }

    setGroupMeta(id, metadata) {
        return this.groupMetaCache.set(id, metadata);
    }

    getMessage(id) {
        return this.messageCache.get(id);
    }

    setMessage(id, message) {
        return this.messageCache.set(id, message);
    }

    getContact(id) {
        return this.contactCache.get(id);
    }

    setContact(id, contact) {
        return this.contactCache.set(id, contact);
    }

    async fetchGroupMetadata(conn, id, force = false) {
        if (!force) {
            const cached = this.groupMetaCache.get(id);
            if (cached) return cached;
        }

        if (this.pendingMetadataFetch.has(id)) {
            return this.pendingMetadataFetch.get(id);
        }

        const promise = conn
            .groupMetadata(id)
            .then((metadata) => {
                if (metadata) {
                    this.groupMetaCache.set(id, metadata);
                    this.emit("group-metadata:fetched", { id, metadata });
                }
                this.pendingMetadataFetch.delete(id);
                return metadata;
            })
            .catch((err) => {
                logger.warn({ err, id }, "Failed to fetch group metadata");
                this.pendingMetadataFetch.delete(id);
                this.stats.errorsCount++;
                return null;
            });

        this.pendingMetadataFetch.set(id, promise);

        setTimeout(() => {
            if (this.pendingMetadataFetch.has(id)) {
                this.pendingMetadataFetch.delete(id);
            }
        }, 30000);

        return promise;
    }

    scheduleBatchUpdate(type, data) {
        this.batchQueue.push({ type, data, timestamp: Date.now() });

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(() => {
            this.processBatchQueue();
        }, this.batchDelay);
    }

    processBatchQueue() {
        if (this.batchQueue.length === 0) {
            this.batchTimer = null;
            return;
        }

        const batches = {};

        for (const item of this.batchQueue) {
            if (!batches[item.type]) {
                batches[item.type] = [];
            }
            batches[item.type].push(item.data);
        }

        this.batchQueue = [];
        this.batchTimer = null;

        for (const [type, items] of Object.entries(batches)) {
            this.emit(`batch:${type}`, items);
        }
    }

    startPeriodicCleanup() {
        this.cleanupInterval = setInterval(() => {
            try {
                const chatDeleted = this.chatCache.cleanup();
                const groupDeleted = this.groupMetaCache.cleanup();
                const messageDeleted = this.messageCache.cleanup();
                const contactDeleted = this.contactCache.cleanup();

                const total = chatDeleted + groupDeleted + messageDeleted + contactDeleted;

                if (total > 0) {
                    logger.debug(
                        `Cleanup: ${total} entries (chats: ${chatDeleted}, groups: ${groupDeleted}, messages: ${messageDeleted}, contacts: ${contactDeleted})`
                    );
                }

                this.stats.lastCleanup = Date.now();
                this.emit("cleanup:completed", { deleted: total });
            } catch (err) {
                logger.error({ err }, "Cleanup error");
                this.stats.errorsCount++;
            }
        }, 300000);
    }

    startPendingCleanup() {
        this.pendingCleanupInterval = setInterval(() => {
            try {
                const now = Date.now();
                const staleThreshold = 60000;

                for (const [key, timestamp] of this.pendingOperations.entries()) {
                    if (now - timestamp > staleThreshold) {
                        this.pendingOperations.delete(key);
                    }
                }
            } catch (err) {
                logger.error({ err }, "Pending cleanup error");
            }
        }, 300000);
    }

    syncToChats(conn) {
        if (!conn?.chats) return;

        let synced = 0;
        const chatKeys = Object.keys(conn.chats);

        for (const key of chatKeys) {
            if (key === "status@broadcast") continue;

            if (!this.chatCache.has(key)) {
                delete conn.chats[key];
                synced++;
            }
        }

        if (synced > 0) {
            logger.info(`Synced ${synced} stale chats removed`);
        }

        return synced;
    }

    clear() {
        const chatCount = this.chatCache.clear();
        const groupCount = this.groupMetaCache.clear();
        const messageCount = this.messageCache.clear();
        const contactCount = this.contactCache.clear();

        this.blocklistCache.clear();
        this.pendingMetadataFetch.clear();
        this.pendingOperations.clear();
        this.batchQueue = [];

        logger.info(
            `Cleared all caches: ${chatCount + groupCount + messageCount + contactCount} entries`
        );
    }

    getStats() {
        return {
            ...this.stats,
            caches: {
                chats: this.chatCache.getStats(),
                groups: this.groupMetaCache.getStats(),
                messages: this.messageCache.getStats(),
                contacts: this.contactCache.getStats(),
            },
            pending: {
                metadata: this.pendingMetadataFetch.size,
                operations: this.pendingOperations.size,
            },
            batchQueue: this.batchQueue.length,
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.pendingCleanupInterval) {
            clearInterval(this.pendingCleanupInterval);
        }
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        this.clear();
        this.removeAllListeners();
    }
}

const isGroup = (id) => typeof id === "string" && id.endsWith("@g.us");
const isStatus = (id) => !id || id === "status@broadcast";
const isPrivate = (id) => typeof id === "string" && id.endsWith("@s.whatsapp.net");
const isChannel = (id) => typeof id === "string" && id.endsWith("@newsletter");
const isBot = (id) => typeof id === "string" && id.endsWith("@bot");
const isLid = (id) => typeof id === "string" && id.endsWith("@lid");
const isHosted = (id) => typeof id === "string" && id.endsWith("@hosted");
const isHostedLid = (id) => typeof id === "string" && id.endsWith("@hosted_lid");

function generateMessageId(msg) {
    return msg.key?.id || `${msg.key?.remoteJid || "unknown"}-${Date.now()}`;
}

function createEventHandlers(conn, manager) {
    const handlers = {
        "messaging-history.set": async ({ chats, contacts, messages, isLatest }) => {
            try {
                logger.info(
                    `History sync: ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, ${messages?.length || 0} messages`
                );

                if (contacts && contacts.length > 0) {
                    for (const contact of contacts) {
                        if (!contact?.id) continue;
                        try {
                            const id = conn.decodeJid(contact.id);
                            if (isStatus(id)) continue;

                            manager.setContact(id, contact);
                            manager.stats.contactsProcessed++;
                        } catch (err) {
                            logger.warn(
                                { err, contactId: contact.id },
                                "Failed to process contact"
                            );
                        }
                    }
                }

                if (chats && chats.length > 0) {
                    const groupsToFetch = [];

                    for (const chat of chats) {
                        if (!chat?.id) continue;
                        try {
                            const id = conn.decodeJid(chat.id);
                            if (isStatus(id)) continue;

                            const existing = manager.getChat(id) || { id };
                            const updated = { ...existing, ...chat, isChats: true };

                            manager.setChat(id, updated);
                            conn.chats[id] = updated;
                            manager.stats.chatsProcessed++;

                            if (isGroup(id)) {
                                groupsToFetch.push(id);
                            }
                        } catch (err) {
                            logger.warn({ err, chatId: chat.id }, "Failed to process chat");
                        }
                    }

                    if (groupsToFetch.length > 0) {
                        const batchSize = 5;
                        for (let i = 0; i < groupsToFetch.length; i += batchSize) {
                            const batch = groupsToFetch.slice(i, i + batchSize);
                            await Promise.allSettled(
                                batch.map((id) => manager.fetchGroupMetadata(conn, id))
                            );
                        }
                    }
                }

                if (messages && messages.length > 0) {
                    for (const msg of messages) {
                        if (!msg?.message) continue;
                        try {
                            const msgId = generateMessageId(msg);
                            manager.setMessage(msgId, msg);
                            manager.stats.messagesProcessed++;
                        } catch (err) {
                            logger.warn({ err }, "Failed to process message");
                        }
                    }
                }

                logger.info("History sync completed");
                manager.emit("history-sync:completed", { isLatest });
            } catch (err) {
                logger.error({ err }, "History sync error");
                manager.stats.errorsCount++;
            }
        },

        "messages.upsert": async ({ messages, type }) => {
            try {
                for (const msg of messages) {
                    if (!msg?.message) continue;

                    const msgId = generateMessageId(msg);
                    const remoteJid = msg.key?.remoteJid;

                    if (isStatus(remoteJid)) continue;

                    manager.setMessage(msgId, msg);
                    manager.stats.messagesProcessed++;

                    if (remoteJid) {
                        const existing = manager.getChat(remoteJid) || { id: remoteJid };
                        const updated = {
                            ...existing,
                            isChats: true,
                            conversationTimestamp: msg.messageTimestamp,
                        };

                        manager.setChat(remoteJid, updated);
                        conn.chats[remoteJid] = updated;
                    }

                    manager.emit("message:upserted", { message: msg, type });
                }
            } catch (err) {
                logger.error({ err }, "messages.upsert error");
                manager.stats.errorsCount++;
            }
        },

        "messages.update": (updates) => {
            try {
                for (const update of updates) {
                    const msgId = update.key?.id;
                    if (!msgId) continue;

                    const existing = manager.getMessage(msgId);
                    if (existing) {
                        const updated = { ...existing, ...update };
                        manager.setMessage(msgId, updated);
                    }

                    manager.emit("message:updated", update);
                }
            } catch (err) {
                logger.error({ err }, "messages.update error");
                manager.stats.errorsCount++;
            }
        },

        "messages.delete": (deletions) => {
            try {
                if (deletions.keys) {
                    for (const key of deletions.keys) {
                        const msgId = key.id;
                        if (msgId) {
                            manager.messageCache.delete(msgId);
                            manager.emit("message:deleted", key);
                        }
                    }
                } else if (deletions.jid) {
                    manager.emit("messages:cleared", deletions.jid);
                }
            } catch (err) {
                logger.error({ err }, "messages.delete error");
                manager.stats.errorsCount++;
            }
        },

        "messages.reaction": (reactions) => {
            try {
                for (const reaction of reactions) {
                    manager.emit("message:reaction", reaction);
                }
            } catch (err) {
                logger.error({ err }, "messages.reaction error");
                manager.stats.errorsCount++;
            }
        },

        "message-receipt.update": (receipts) => {
            try {
                for (const receipt of receipts) {
                    manager.emit("message:receipt", receipt);
                }
            } catch (err) {
                logger.error({ err }, "message-receipt.update error");
                manager.stats.errorsCount++;
            }
        },

        "chats.upsert": (chatsUpsert) => {
            try {
                const chatsArray = Array.isArray(chatsUpsert) ? chatsUpsert : [chatsUpsert];
                const groupsToInsert = [];

                for (const chatData of chatsArray) {
                    if (!chatData?.id || isStatus(chatData.id)) continue;

                    const { id } = chatData;
                    const existing = manager.getChat(id) || { id };
                    const chat = { ...existing, ...chatData, isChats: true };

                    manager.setChat(id, chat);
                    conn.chats[id] = chat;
                    manager.stats.chatsProcessed++;

                    if (isGroup(id)) {
                        groupsToInsert.push(id);
                    }

                    manager.emit("chat:upserted", chat);
                }

                if (groupsToInsert.length > 0 && conn.insertAllGroup) {
                    conn.insertAllGroup().catch((err) => {
                        logger.warn({ err }, "Failed to insert all groups");
                    });
                }
            } catch (err) {
                logger.error({ err }, "chats.upsert error");
                manager.stats.errorsCount++;
            }
        },

        "chats.update": (chatsUpdate) => {
            try {
                const updates = Array.isArray(chatsUpdate) ? chatsUpdate : [chatsUpdate];

                for (const update of updates) {
                    if (!update?.id) continue;
                    const id = conn.decodeJid(update.id);
                    if (isStatus(id)) continue;

                    const existing = manager.getChat(id) || { id };
                    const chat = { ...existing, ...update };

                    manager.setChat(id, chat);
                    conn.chats[id] = chat;

                    manager.emit("chat:updated", chat);
                }
            } catch (err) {
                logger.error({ err }, "chats.update error");
                manager.stats.errorsCount++;
            }
        },

        "chats.delete": (deletions) => {
            try {
                const ids = Array.isArray(deletions) ? deletions : [deletions];

                for (const id of ids) {
                    if (isStatus(id)) continue;

                    manager.chatCache.delete(id);
                    delete conn.chats[id];

                    manager.emit("chat:deleted", id);
                }
            } catch (err) {
                logger.error({ err }, "chats.delete error");
                manager.stats.errorsCount++;
            }
        },

        "chats.set": async ({ chats: chatsUpdate }) => {
            try {
                const updates = [];

                for (let { id, name, readOnly } of chatsUpdate) {
                    id = conn.decodeJid(id);
                    if (isStatus(id)) continue;

                    const existing = manager.getChat(id) || { id };
                    const chat = { ...existing, isChats: !readOnly };

                    if (name) {
                        chat[isGroup(id) ? "subject" : "name"] = name;
                    }

                    if (isGroup(id)) {
                        updates.push({ id, chat, name });
                    } else {
                        manager.setChat(id, chat);
                        conn.chats[id] = chat;
                    }
                }

                if (updates.length > 0) {
                    await Promise.allSettled(
                        updates.map(async ({ id, chat, name }) => {
                            const metadata = await manager.fetchGroupMetadata(conn, id);
                            if (metadata) {
                                chat.subject = name || metadata.subject;
                                chat.metadata = metadata;
                            }
                            manager.setChat(id, chat);
                            conn.chats[id] = chat;
                        })
                    );
                }
            } catch (err) {
                logger.error({ err }, "chats.set error");
                manager.stats.errorsCount++;
            }
        },

        "contacts.upsert": (contacts) => {
            try {
                const contactArray = Array.isArray(contacts)
                    ? contacts
                    : contacts.contacts
                      ? Array.isArray(contacts.contacts)
                          ? contacts.contacts
                          : [contacts.contacts]
                      : [contacts];

                for (const contact of contactArray) {
                    if (!contact?.id) continue;

                    const id = conn.decodeJid(contact.id);
                    if (isStatus(id)) continue;

                    manager.setContact(id, contact);
                    manager.stats.contactsProcessed++;

                    const existing = manager.getChat(id) || { id };
                    const update = { ...existing, ...contact, id };

                    if (isGroup(id)) {
                        const newSubject =
                            contact.subject || contact.name || existing.subject || "";
                        if (newSubject) update.subject = newSubject;
                    } else {
                        const newName =
                            contact.notify ||
                            contact.name ||
                            existing.name ||
                            existing.notify ||
                            "";
                        if (newName) update.name = newName;
                    }

                    manager.setChat(id, update);
                    conn.chats[id] = update;

                    manager.emit("contact:upserted", contact);
                }
            } catch (err) {
                logger.error({ err }, "contacts.upsert error");
                manager.stats.errorsCount++;
            }
        },

        "contacts.update": (updates) => {
            try {
                const updateArray = Array.isArray(updates) ? updates : [updates];

                for (const update of updateArray) {
                    if (!update?.id) continue;

                    const id = conn.decodeJid(update.id);
                    if (isStatus(id)) continue;

                    const existing = manager.getContact(id) || { id };
                    const contact = { ...existing, ...update };

                    manager.setContact(id, contact);
                    manager.emit("contact:updated", contact);
                }
            } catch (err) {
                logger.error({ err }, "contacts.update error");
                manager.stats.errorsCount++;
            }
        },

        "groups.upsert": async (groupsUpsert) => {
            try {
                const groups = Array.isArray(groupsUpsert) ? groupsUpsert : [groupsUpsert];

                for (const group of groups) {
                    if (!group?.id) continue;
                    const id = conn.decodeJid(group.id);
                    if (isStatus(id) || !isGroup(id)) continue;

                    const existing = manager.getChat(id) || { id };
                    const chat = { ...existing, ...group, isChats: true };

                    manager.setChat(id, chat);
                    conn.chats[id] = chat;

                    await manager.fetchGroupMetadata(conn, id);

                    manager.emit("group:upserted", chat);
                }
            } catch (err) {
                logger.error({ err }, "groups.upsert error");
                manager.stats.errorsCount++;
            }
        },

        "groups.update": async (groupsUpdates) => {
            try {
                const updatesArray = Array.isArray(groupsUpdates) ? groupsUpdates : [groupsUpdates];
                const validUpdates = [];

                for (const update of updatesArray) {
                    if (!update?.id) continue;

                    const id = conn.decodeJid(update.id);
                    if (isStatus(id) || !isGroup(id)) continue;

                    validUpdates.push({ id, update });
                }

                await Promise.allSettled(
                    validUpdates.map(async ({ id, update }) => {
                        const existing = manager.getChat(id) || { id };
                        const chat = { ...existing, isChats: true };

                        const metadata = await manager.fetchGroupMetadata(conn, id, true);
                        if (metadata) {
                            chat.metadata = metadata;
                            chat.subject = update.subject || metadata.subject;
                        } else if (update.subject) {
                            chat.subject = update.subject;
                        }

                        manager.setChat(id, chat);
                        conn.chats[id] = chat;

                        manager.emit("group:updated", chat);
                    })
                );
            } catch (err) {
                logger.error({ err }, "groups.update error");
                manager.stats.errorsCount++;
            }
        },

        "group-participants.update": async ({ id, participants, action }) => {
            try {
                if (!id) return;
                id = conn.decodeJid(id);
                if (isStatus(id)) return;

                const existing = manager.getChat(id) || { id };
                const chat = { ...existing, isChats: true };

                const metadata = await manager.fetchGroupMetadata(conn, id, true);
                if (metadata) {
                    chat.subject = metadata.subject;
                    chat.metadata = metadata;
                }

                manager.setChat(id, chat);
                conn.chats[id] = chat;

                manager.emit("group:participants-updated", { id, participants, action });
            } catch (err) {
                logger.error({ err }, "group-participants.update error");
                manager.stats.errorsCount++;
            }
        },

        "blocklist.set": ({ blocklist }) => {
            try {
                manager.blocklistCache.clear();
                for (const jid of blocklist) {
                    manager.blocklistCache.add(jid);
                }
                manager.emit("blocklist:set", blocklist);
            } catch (err) {
                logger.error({ err }, "blocklist.set error");
                manager.stats.errorsCount++;
            }
        },

        "blocklist.update": ({ blocklist, type }) => {
            try {
                for (const jid of blocklist) {
                    if (type === "add") {
                        manager.blocklistCache.add(jid);
                    } else {
                        manager.blocklistCache.delete(jid);
                    }
                }
                manager.emit("blocklist:updated", { blocklist, type });
            } catch (err) {
                logger.error({ err }, "blocklist.update error");
                manager.stats.errorsCount++;
            }
        },

        call: (calls) => {
            try {
                const callArray = Array.isArray(calls) ? calls : [calls];
                for (const call of callArray) {
                    manager.emit("call:received", call);
                }
            } catch (err) {
                logger.error({ err }, "call event error");
                manager.stats.errorsCount++;
            }
        },

        "presence.update": ({ id, presences }) => {
            try {
                if (!id || !presences) return;

                const sender = Object.keys(presences)[0] || id;
                const _sender = conn.decodeJid(sender);
                const presenceData = presences[sender];

                if (!presenceData) return;

                const presence = presenceData.lastKnownPresence || "composing";
                const existing = manager.getChat(_sender) || { id: _sender };
                const chat = { ...existing, presences: presence };

                manager.setChat(_sender, chat);
                conn.chats[_sender] = chat;

                if (isGroup(id)) {
                    const existingGroup = manager.getChat(id) || { id };
                    const groupChat = { ...existingGroup, isChats: true };
                    manager.setChat(id, groupChat);
                    conn.chats[id] = groupChat;
                }

                manager.emit("presence:updated", { id, sender: _sender, presence });
            } catch (err) {
                logger.error({ err }, "presence.update error");
                manager.stats.errorsCount++;
            }
        },
    };

    return handlers;
}

export default function bind(conn) {
    if (!conn.chats) conn.chats = {};

    const manager = new StoreManager();
    const handlers = createEventHandlers(conn, manager);

    for (const [event, handler] of Object.entries(handlers)) {
        conn.ev.on(event, handler);
    }

    const syncInterval = setInterval(() => {
        try {
            manager.syncToChats(conn);
        } catch (err) {
            logger.error({ err }, "Sync interval error");
        }
    }, 300000);

    conn.cleanupStore = () => {
        clearInterval(syncInterval);

        for (const [event, handler] of Object.entries(handlers)) {
            conn.ev.off(event, handler);
        }

        manager.destroy();
        logger.info("Store cleanup completed");
    };

    conn._storeManager = manager;

    conn.loadMessage = async (jid, id) => {
        return manager.getMessage(id) || null;
    };

    conn.getStoreStats = () => manager.getStats();

    logger.info("Store initialized successfully");
    return conn;
}
