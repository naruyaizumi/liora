import { StoreManager } from "./manager.js";
import { createEventHandlers } from "./handler.js";
import { logger, isGroup, isStatus, isBroadcast, isPrivateChat, sanitizeJid } from "./utils.js";

export default function bind(conn, options = {}) {
    if (!conn) {
        throw new Error("Connection object is required");
    }

    if (!conn.chats) {
        conn.chats = {};
    }

    const manager = new StoreManager(options);
    const handlers = createEventHandlers(conn, manager);

    for (const [event, handler] of Object.entries(handlers)) {
        conn.ev.on(event, handler);
    }

    conn.cleanupStore = () => {
        logger.info("Cleaning up store");

        for (const [event, handler] of Object.entries(handlers)) {
            conn.ev.off(event, handler);
        }

        manager.destroy();

        logger.info("Store cleanup completed");
    };

    conn._storeManager = manager;

    conn.loadMessage = async (jid, id) => {
        try {
            const cached = manager.getMessage(id);
            if (cached) {
                return cached;
            }

            if (conn.fetchMessageFromStore) {
                const fetched = await conn.fetchMessageFromStore(jid, id);
                if (fetched) {
                    manager.setMessage(id, fetched);
                    return fetched;
                }
            }

            return null;
        } catch (err) {
            logger.error({ err, jid, id }, "Failed to load message");
            return null;
        }
    };

    conn.getChatWithMessages = async (jid, limit = 50) => {
        try {
            const chat = manager.getChat(jid);
            if (!chat) return null;

            const messages = [];
            for (const [id, msg] of manager.messageCache.entries()) {
                if (msg.key?.remoteJid === jid) {
                    messages.push(msg);
                }
            }

            messages.sort((a, b) => (b.messageTimestamp || 0) - (a.messageTimestamp || 0));

            return {
                ...chat,
                messages: messages.slice(0, limit),
            };
        } catch (err) {
            logger.error({ err, jid }, "Failed to get chat with messages");
            return null;
        }
    };

    conn.getGroupMetadata = async (jid, force = false) => {
        try {
            if (!isGroup(jid)) {
                throw new Error("JID is not a group");
            }

            return await manager.fetchGroupMetadata(conn, jid, force);
        } catch (err) {
            logger.error({ err, jid }, "Failed to get group metadata");
            return null;
        }
    };

    conn.getAllChats = () => {
        const chats = [];
        for (const [id, chat] of manager.chatCache.entries()) {
            chats.push(chat);
        }
        return chats;
    };

    conn.getAllGroups = () => {
        const groups = [];
        for (const [id, chat] of manager.chatCache.entries()) {
            if (isGroup(id)) {
                groups.push(chat);
            }
        }
        return groups;
    };

    conn.getAllContacts = () => {
        const contacts = [];
        for (const [id, contact] of manager.contactCache.entries()) {
            contacts.push(contact);
        }
        return contacts;
    };

    conn.searchChats = (query) => {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const [id, chat] of manager.chatCache.entries()) {
            const name = (chat.name || chat.subject || "").toLowerCase();
            const contact = manager.getContact(id);
            const contactName = (contact?.name || contact?.notify || "").toLowerCase();

            if (
                name.includes(lowerQuery) ||
                contactName.includes(lowerQuery) ||
                id.includes(lowerQuery)
            ) {
                results.push({
                    ...chat,
                    contact,
                });
            }
        }

        return results;
    };

    conn.getStoreMetrics = () => {
        return manager.getMetrics();
    };

    conn.getStoreStats = () => {
        const metrics = manager.getMetrics();

        return {
            ...metrics,
            health: {
                disposed: manager.disposed,
                cacheUtilization: {
                    chats:
                        ((metrics.caches.chats.size / metrics.caches.chats.max) * 100).toFixed(2) +
                        "%",
                    groups:
                        ((metrics.caches.groups.size / metrics.caches.groups.max) * 100).toFixed(
                            2
                        ) + "%",
                    messages:
                        (
                            (metrics.caches.messages.size / metrics.caches.messages.max) *
                            100
                        ).toFixed(2) + "%",
                    contacts:
                        (
                            (metrics.caches.contacts.size / metrics.caches.contacts.max) *
                            100
                        ).toFixed(2) + "%",
                },
                hitRates: {
                    chat:
                        (
                            (metrics.hits.chat / (metrics.hits.chat + metrics.misses.chat)) *
                            100
                        ).toFixed(2) + "%",
                    group:
                        (
                            (metrics.hits.group / (metrics.hits.group + metrics.misses.group)) *
                            100
                        ).toFixed(2) + "%",
                    message:
                        (
                            (metrics.hits.message /
                                (metrics.hits.message + metrics.misses.message)) *
                            100
                        ).toFixed(2) + "%",
                    contact:
                        (
                            (metrics.hits.contact /
                                (metrics.hits.contact + metrics.misses.contact)) *
                            100
                        ).toFixed(2) + "%",
                },
            },
        };
    };

    manager.on("chat:update", (data) => conn.ev.emit("store.chat.update", data));
    manager.on("chat:delete", (data) => conn.ev.emit("store.chat.delete", data));
    manager.on("contact:update", (data) => conn.ev.emit("store.contact.update", data));
    manager.on("group:metadata", (data) => conn.ev.emit("store.group.metadata", data));
    manager.on("message:set", (data) => conn.ev.emit("store.message.set", data));
    manager.on("presence:update", (data) => conn.ev.emit("store.presence.update", data));
    manager.on("cleanup", (data) => conn.ev.emit("store.cleanup", data));

    logger.info(
        {
            options: {
                chatCacheSize: manager.options.chatCacheSize,
                groupMetaCacheSize: manager.options.groupMetaCacheSize,
                messageCacheSize: manager.options.messageCacheSize,
                contactCacheSize: manager.options.contactCacheSize,
                cleanupInterval: manager.options.cleanupInterval,
            },
        },
        "Store initialized successfully"
    );

    return conn;
}
