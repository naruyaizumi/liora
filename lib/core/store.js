import pino from "pino";

const logger = pino({
    level: "info",
    base: { module: "STORE" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

class LRUCache {
    constructor(maxSize = 300) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        if (!key) return undefined;
        const value = this.cache.get(key);
        if (value === undefined) return undefined;
        
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key, value) {
        if (!key) return false;
        
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, value);
        return true;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }
}

class StoreManager {
    constructor() {
        this.chatCache = new LRUCache(200);
        this.groupMetaCache = new LRUCache(50);
        this.messageCache = new LRUCache(100);
        this.contactCache = new LRUCache(300);
        this.pendingMeta = new Map();
        this.cleanupTimer = setInterval(() => this._aggressiveCleanup(), 180000);
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

        if (this.pendingMeta.has(id)) {
            return this.pendingMeta.get(id);
        }

        const promise = conn.groupMetadata(id)
            .then((metadata) => {
                if (metadata) this.groupMetaCache.set(id, metadata);
                this.pendingMeta.delete(id);
                return metadata;
            })
            .catch(() => {
                this.pendingMeta.delete(id);
                return null;
            });

        this.pendingMeta.set(id, promise);
        
        setTimeout(() => this.pendingMeta.delete(id), 20000);

        return promise;
    }

    _aggressiveCleanup() {
        const maxChat = this.chatCache.maxSize;
        const maxGroup = this.groupMetaCache.maxSize;
        const maxMsg = this.messageCache.maxSize;
        const maxContact = this.contactCache.maxSize;

        if (this.chatCache.size > maxChat * 0.8) {
            const toRemove = Math.floor(maxChat * 0.3);
            const keys = Array.from(this.chatCache.cache.keys()).slice(0, toRemove);
            keys.forEach(k => this.chatCache.delete(k));
        }

        if (this.groupMetaCache.size > maxGroup * 0.8) {
            const toRemove = Math.floor(maxGroup * 0.3);
            const keys = Array.from(this.groupMetaCache.cache.keys()).slice(0, toRemove);
            keys.forEach(k => this.groupMetaCache.delete(k));
        }

        if (this.messageCache.size > maxMsg * 0.8) {
            const toRemove = Math.floor(maxMsg * 0.5);
            const keys = Array.from(this.messageCache.cache.keys()).slice(0, toRemove);
            keys.forEach(k => this.messageCache.delete(k));
        }

        if (this.contactCache.size > maxContact * 0.8) {
            const toRemove = Math.floor(maxContact * 0.3);
            const keys = Array.from(this.contactCache.cache.keys()).slice(0, toRemove);
            keys.forEach(k => this.contactCache.delete(k));
        }

        if (this.pendingMeta.size > 20) {
            this.pendingMeta.clear();
        }

        if (global.gc) global.gc();
    }

    clear() {
        this.chatCache.clear();
        this.groupMetaCache.clear();
        this.messageCache.clear();
        this.contactCache.clear();
        this.pendingMeta.clear();
    }

    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
    }
}

const isGroup = (id) => typeof id === "string" && id.endsWith("@g.us");
const isStatus = (id) => !id || id === "status@broadcast";

function createEventHandlers(conn, manager) {
    const handlers = {
        "messaging-history.set": async ({ chats, contacts, messages }) => {
            try {
                if (contacts?.length) {
                    for (const contact of contacts) {
                        if (!contact?.id || isStatus(contact.id)) continue;
                        const id = conn.decodeJid(contact.id);
                        manager.setContact(id, contact);
                    }
                }

                const groupsToFetch = [];
                if (chats?.length) {
                    for (const chat of chats) {
                        if (!chat?.id || isStatus(chat.id)) continue;
                        const id = conn.decodeJid(chat.id);
                        
                        manager.setChat(id, { ...chat, isChats: true });
                        conn.chats[id] = { ...chat, isChats: true };
                        
                        if (isGroup(id)) groupsToFetch.push(id);
                    }

                    if (groupsToFetch.length > 0) {
                        for (let i = 0; i < groupsToFetch.length; i += 3) {
                            const batch = groupsToFetch.slice(i, i + 3);
                            await Promise.allSettled(
                                batch.map(id => manager.fetchGroupMetadata(conn, id))
                            );
                        }
                    }
                }

                logger.info(`History synced: ${chats?.length || 0} chats, ${contacts?.length || 0} contacts`);
            } catch (err) {
                logger.error({ err: err.message }, "History sync error");
            }
        },

        "messages.upsert": async ({ messages }) => {
            try {
                for (const msg of messages) {
                    if (!msg?.message) continue;
                    
                    const remoteJid = msg.key?.remoteJid;
                    if (isStatus(remoteJid)) continue;

                    const msgId = msg.key?.id || `${remoteJid}-${Date.now()}`;
                    manager.setMessage(msgId, msg);

                    if (remoteJid) {
                        const chat = manager.getChat(remoteJid) || { id: remoteJid };
                        chat.conversationTimestamp = msg.messageTimestamp;
                        manager.setChat(remoteJid, chat);
                        conn.chats[remoteJid] = chat;
                    }
                }
            } catch (err) {
                logger.error({ err: err.message }, "messages.upsert error");
            }
        },

        "chats.upsert": (chatsUpsert) => {
            try {
                const chatsArray = Array.isArray(chatsUpsert) ? chatsUpsert : [chatsUpsert];

                for (const chatData of chatsArray) {
                    if (!chatData?.id || isStatus(chatData.id)) continue;
                    
                    const { id } = chatData;
                    const chat = { ...chatData, isChats: true };
                    
                    manager.setChat(id, chat);
                    conn.chats[id] = chat;
                }
            } catch (err) {
                logger.error({ err: err.message }, "chats.upsert error");
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
                }
            } catch (err) {
                logger.error({ err: err.message }, "chats.update error");
            }
        },

        "chats.delete": (deletions) => {
            try {
                const ids = Array.isArray(deletions) ? deletions : [deletions];
                for (const id of ids) {
                    if (isStatus(id)) continue;
                    manager.chatCache.delete(id);
                    delete conn.chats[id];
                }
            } catch (err) {
                logger.error({ err: err.message }, "chats.delete error");
            }
        },

        "contacts.upsert": (contacts) => {
            try {
                const contactArray = Array.isArray(contacts) ? contacts : [contacts];

                for (const contact of contactArray) {
                    if (!contact?.id) continue;
                    const id = conn.decodeJid(contact.id);
                    if (isStatus(id)) continue;

                    manager.setContact(id, contact);

                    const chat = manager.getChat(id);
                    if (chat) {
                        if (isGroup(id)) {
                            chat.subject = contact.subject || chat.subject;
                        } else {
                            chat.name = contact.notify || contact.name || chat.name;
                        }
                        manager.setChat(id, chat);
                        conn.chats[id] = chat;
                    }
                }
            } catch (err) {
                logger.error({ err: err.message }, "contacts.upsert error");
            }
        },

        "groups.update": async (groupsUpdates) => {
            try {
                const updatesArray = Array.isArray(groupsUpdates) ? groupsUpdates : [groupsUpdates];

                for (const update of updatesArray) {
                    if (!update?.id) continue;
                    const id = conn.decodeJid(update.id);
                    if (isStatus(id) || !isGroup(id)) continue;

                    const chat = manager.getChat(id) || { id };
                    
                    const metadata = await manager.fetchGroupMetadata(conn, id, true);
                    if (metadata) {
                        chat.subject = update.subject || metadata.subject;
                        chat.metadata = metadata;
                    }
                    
                    manager.setChat(id, chat);
                    conn.chats[id] = chat;
                }
            } catch (err) {
                logger.error({ err: err.message }, "groups.update error");
            }
        },

        "group-participants.update": async ({ id }) => {
            try {
                if (!id || isStatus(id)) return;
                id = conn.decodeJid(id);
                
                await manager.fetchGroupMetadata(conn, id, true);
            } catch (err) {
                logger.error({ err: err.message }, "group-participants.update error");
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

    conn.cleanupStore = () => {
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

    logger.info("Store initialized (optimized mode)");
    return conn;
}