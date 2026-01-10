/**
 * @file WhatsApp event binding with in-memory store
 * @module store/bind
 * @description Binds WhatsApp connection events to in-memory store operations 
 * for real-time data synchronization and caching.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { MemoryStore, EVENT_PRIORITY } from "./core.js";

/**
 * Redis-style key prefixes for different data types
 * @constant {string}
 * @private
 */
const REDIS_PREFIX = "liora:chat:";
const REDIS_PRESENCE_PREFIX = "liora:presence:";
const REDIS_MESSAGE_PREFIX = "liora:message:";
const REDIS_CONTACT_PREFIX = "liora:contact:";
const REDIS_GROUP_PREFIX = "liora:group:";
const REDIS_CALL_PREFIX = "liora:call:";
const REDIS_BLOCKLIST_PREFIX = "liora:blocklist:";

/**
 * Singleton memory store instance
 * @private
 * @type {MemoryStore}
 */
const memoryStore = new MemoryStore();

/**
 * Binds WhatsApp connection events to memory store operations
 * @function bind
 * @param {Object} conn - WhatsApp connection object
 * @returns {void}
 * 
 * @overview
 * This function attaches event listeners to the WhatsApp connection and 
 * synchronizes all data changes to an in-memory store. It provides methods
 * for retrieving and updating chat data, contacts, messages, and other
 * WhatsApp entities with atomic operations.
 * 
 * @architecture
 * 1. Attaches store methods to connection object
 * 2. Listens to WhatsApp events (messages, chats, contacts, groups, etc.)
 * 3. Synchronizes data to memory store with proper key prefixes
 * 4. Maintains data consistency across different entity types
 * 5. Handles priority-based event processing
 */
export default function bind(conn) {
    global.logger?.info("Memory store initialized");

    /**
     * Attach memory store instance to connection for direct access
     * @private
     */
    conn._memoryStore = memoryStore;

    /**
     * Chat Management Methods
     * @namespace
     */

    /**
     * Retrieves chat data from memory store
     * @method getChat
     * @param {string} jid - Chat JID identifier
     * @returns {Object|null} Chat data or null if not found
     */
    conn.getChat = (jid) => {
        const key = `${REDIS_PREFIX}${jid}`;
        return memoryStore.get(key);
    };

    /**
     * Stores or updates chat data atomically
     * @method setChat
     * @param {string} jid - Chat JID identifier
     * @param {Object} data - Chat data object
     * @returns {void}
     */
    conn.setChat = (jid, data) => {
        const key = `${REDIS_PREFIX}${jid}`;
        memoryStore.atomicSet(key, data, "chat");
    };

    /**
     * Deletes chat data from store
     * @method deleteChat
     * @param {string} jid - Chat JID identifier
     * @returns {void}
     */
    conn.deleteChat = (jid) => {
        const key = `${REDIS_PREFIX}${jid}`;
        memoryStore.del(key);
    };

    /**
     * Retrieves all chats from store
     * @method getAllChats
     * @returns {Array<Object>} Array of chat objects
     */
    conn.getAllChats = () => {
        const keys = memoryStore.keys(`${REDIS_PREFIX}*`);
        const chats = memoryStore.mget(keys);
        return chats.filter((c) => c !== null);
    };

    /**
     * Contact Management Methods
     * @namespace
     */

    /**
     * Retrieves contact data from memory store
     * @method getContact
     * @param {string} jid - Contact JID identifier
     * @returns {Object|null} Contact data or null if not found
     */
    conn.getContact = (jid) => {
        const key = `${REDIS_CONTACT_PREFIX}${jid}`;
        return memoryStore.get(key);
    };

    /**
     * Stores or updates contact data atomically
     * @method setContact
     * @param {string} jid - Contact JID identifier
     * @param {Object} data - Contact data object
     * @returns {void}
     */
    conn.setContact = (jid, data) => {
        const key = `${REDIS_CONTACT_PREFIX}${jid}`;
        memoryStore.atomicSet(key, data, "contact");
    };

    /**
     * Retrieves all contacts from store
     * @method getAllContacts
     * @returns {Array<Object>} Array of contact objects
     */
    conn.getAllContacts = () => {
        const keys = memoryStore.keys(`${REDIS_CONTACT_PREFIX}*`);
        return memoryStore.mget(keys);
    };

    /**
     * Message Management Methods
     * @namespace
     */

    /**
     * Retrieves specific message from store
     * @method getMessage
     * @param {string} chatId - Chat JID identifier
     * @param {string} messageId - Message identifier
     * @returns {Object|null} Message data or null if not found
     */
    conn.getMessage = (chatId, messageId) => {
        const key = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
        return memoryStore.get(key);
    };

    /**
     * Stores or updates message data atomically
     * @method setMessage
     * @param {string} chatId - Chat JID identifier
     * @param {string} messageId - Message identifier
     * @param {Object} data - Message data object
     * @returns {void}
     */
    conn.setMessage = (chatId, messageId, data) => {
        const key = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
        memoryStore.atomicSet(key, data, "message");
    };

    /**
     * Retrieves recent messages for a chat
     * @method getChatMessages
     * @param {string} chatId - Chat JID identifier
     * @param {number} [limit=40] - Maximum number of messages to return
     * @returns {Array<Object>} Array of message objects (most recent first)
     */
    conn.getChatMessages = (chatId, limit = 40) => {
        const pattern = `${REDIS_MESSAGE_PREFIX}${chatId}:*`;
        const keys = memoryStore.keys(pattern);
        const messages = memoryStore.mget(keys);
        return messages.filter((m) => m !== null).slice(-limit);
    };

    /**
     * Group Management Methods
     * @namespace
     */

    /**
     * Retrieves group metadata from store
     * @method getGroupMetadata
     * @param {string} groupId - Group JID identifier
     * @returns {Object|null} Group metadata or null if not found
     */
    conn.getGroupMetadata = (groupId) => {
        const key = `${REDIS_GROUP_PREFIX}${groupId}`;
        return memoryStore.get(key);
    };

    /**
     * Stores or updates group metadata atomically
     * @method setGroupMetadata
     * @param {string} groupId - Group JID identifier
     * @param {Object} metadata - Group metadata object
     * @returns {void}
     */
    conn.setGroupMetadata = (groupId, metadata) => {
        const key = `${REDIS_GROUP_PREFIX}${groupId}`;
        memoryStore.atomicSet(key, metadata, "group");
    };

    /**
     * Presence Management Methods
     * @namespace
     */

    /**
     * Retrieves user presence data from store
     * @method getPresence
     * @param {string} jid - User JID identifier
     * @returns {Object|null} Presence data or null if not found
     */
    conn.getPresence = (jid) => {
        const key = `${REDIS_PRESENCE_PREFIX}${jid}`;
        return memoryStore.get(key);
    };

    /**
     * Stores or updates presence data atomically
     * @method setPresence
     * @param {string} jid - User JID identifier
     * @param {Object} presence - Presence data object
     * @returns {void}
     */
    conn.setPresence = (jid, presence) => {
        const key = `${REDIS_PRESENCE_PREFIX}${jid}`;
        memoryStore.atomicSet(key, presence, "presence");
    };

    /**
     * Call Management Methods
     * @namespace
     */

    /**
     * Retrieves call data from store
     * @method getCall
     * @param {string} callId - Call identifier
     * @returns {Object|null} Call data or null if not found
     */
    conn.getCall = (callId) => {
        const key = `${REDIS_CALL_PREFIX}${callId}`;
        return memoryStore.get(key);
    };

    /**
     * Stores or updates call data atomically
     * @method setCall
     * @param {string} callId - Call identifier
     * @param {Object} callData - Call data object
     * @returns {void}
     */
    conn.setCall = (callId, callData) => {
        const key = `${REDIS_CALL_PREFIX}${callId}`;
        memoryStore.atomicSet(key, callData, "call");
    };

    /**
     * Blocklist Management Methods
     * @namespace
     */

    /**
     * Retrieves current blocklist from store
     * @method getBlocklist
     * @returns {Array<string>} Array of blocked JIDs
     */
    conn.getBlocklist = () => {
        const key = `${REDIS_BLOCKLIST_PREFIX}list`;
        return memoryStore.get(key) || [];
    };

    /**
     * Updates blocklist in store atomically
     * @method setBlocklist
     * @param {Array<string>} blocklist - Array of blocked JIDs
     * @returns {void}
     */
    conn.setBlocklist = (blocklist) => {
        const key = `${REDIS_BLOCKLIST_PREFIX}list`;
        memoryStore.atomicSet(key, blocklist, "blocklist");
    };

    /**
     * Event Handlers
     * @namespace
     */

    /**
     * Handles connection state updates
     * @listens connection.update
     * @param {Object} update - Connection update object
     */
    conn.ev.on("connection.update", (update) => {
        memoryStore.enqueueEvent("connection.update", update, EVENT_PRIORITY.CORE);

        try {
            if (update.connection === "open") {
                global.logger?.info("Connection established - syncing data");
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles credentials updates
     * @listens creds.update
     * @param {Object} update - Credentials update object
     */
    conn.ev.on("creds.update", (update) => {
        memoryStore.enqueueEvent("creds.update", update, EVENT_PRIORITY.CORE);
    });

    /**
     * Handles initial messaging history sync
     * @listens messaging-history.set
     * @param {Object} data - History data object
     * @param {Array<Object>} data.chats - Array of chat objects
     * @param {Array<Object>} data.contacts - Array of contact objects
     * @param {Array<Object>} data.messages - Array of message objects
     * @param {boolean} data.isLatest - Whether this is the latest history
     */
    conn.ev.on("messaging-history.set", ({ chats, contacts, messages, isLatest }) => {
        memoryStore.enqueueEvent(
            "messaging-history.set",
            { chats, contacts, messages, isLatest },
            EVENT_PRIORITY.CORE
        );

        try {
            // Process and store chats
            if (chats) {
                for (const chat of chats) {
                    const id = conn.decodeJid(chat.id);
                    if (!id || id === "status@broadcast") continue;

                    const isGroup = id.endsWith("@g.us");
                    const chatData = {
                        id,
                        conversationTimestamp: chat.conversationTimestamp,
                        unreadCount: chat.unreadCount || 0,
                        archived: chat.archived || false,
                        pinned: chat.pinned || 0,
                        muteEndTime: chat.muteEndTime,
                        name: chat.name,
                        isChats: true,
                        ...(isGroup && { subject: chat.name }),
                    };

                    memoryStore.atomicSet(`${REDIS_PREFIX}${id}`, chatData, "chat");

                    // Fetch and store group metadata if applicable
                    if (isGroup) {
                        conn.groupMetadata(id)
                            .then((metadata) => {
                                if (metadata) {
                                    conn.setGroupMetadata(id, metadata);
                                    chatData.metadata = metadata;
                                    memoryStore.atomicSet(`${REDIS_PREFIX}${id}`, chatData, "chat");
                                }
                            })
                            .catch(() => {});
                    }
                }
            }

            // Process and store contacts
            if (contacts) {
                for (const contact of contacts) {
                    const id = conn.decodeJid(contact.id);
                    if (!id || id === "status@broadcast") continue;

                    conn.setContact(id, {
                        id,
                        name: contact.name || contact.notify || contact.verifiedName,
                        notify: contact.notify,
                        verifiedName: contact.verifiedName,
                        imgUrl: contact.imgUrl,
                        status: contact.status,
                    });
                }
            }

            // Process and store messages
            if (messages) {
                const messagesByChat = {};

                for (const msg of messages) {
                    const chatId = msg.key?.remoteJid;
                    if (!chatId || chatId === "status@broadcast") continue;

                    if (!messagesByChat[chatId]) {
                        messagesByChat[chatId] = [];
                    }
                    messagesByChat[chatId].push(msg);
                }

                // Store recent messages per chat
                for (const [chatId, msgs] of Object.entries(messagesByChat)) {
                    const toSave = msgs.slice(-40);

                    for (const msg of toSave) {
                        const messageId = msg.key?.id;
                        if (messageId) {
                            conn.setMessage(chatId, messageId, msg);
                        }
                    }
                }
            }

            global.logger?.info(
                {
                    chats: chats?.length || 0,
                    contacts: contacts?.length || 0,
                    messages: messages?.length || 0,
                    isLatest,
                },
                "Messaging history synced"
            );
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles new or updated messages
     * @listens messages.upsert
     * @param {Object} data - Message upsert data
     * @param {Array<Object>} data.messages - Array of message objects
     * @param {string} data.type - Update type (notify, append, replace)
     */
    conn.ev.on("messages.upsert", ({ messages, type }) => {
        memoryStore.enqueueEvent("messages.upsert", { messages, type }, EVENT_PRIORITY.CORE);

        try {
            for (const msg of messages) {
                const chatId = msg.key?.remoteJid;
                const messageId = msg.key?.id;

                if (!chatId || !messageId || chatId === "status@broadcast") continue;

                conn.setMessage(chatId, messageId, msg);

                // Update chat metadata
                let chat = conn.getChat(chatId) || { id: chatId };
                chat.conversationTimestamp = msg.messageTimestamp;
                chat.isChats = true;

                if (!msg.key?.fromMe) {
                    chat.unreadCount = (chat.unreadCount || 0) + 1;
                }

                conn.setChat(chatId, chat);
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles message updates (status changes, edits)
     * @listens messages.update
     * @param {Array<Object>} updates - Array of message updates
     */
    conn.ev.on("messages.update", (updates) => {
        memoryStore.enqueueEvent("messages.update", updates, EVENT_PRIORITY.CORE);

        try {
            for (const { key, update } of updates) {
                const chatId = key?.remoteJid;
                const messageId = key?.id;

                if (!chatId || !messageId) continue;

                const msg = conn.getMessage(chatId, messageId);
                if (msg) {
                    Object.assign(msg, update);
                    conn.setMessage(chatId, messageId, msg);
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles message deletions
     * @listens messages.delete
     * @param {Object} deletion - Deletion data
     */
    conn.ev.on("messages.delete", (deletion) => {
        memoryStore.enqueueEvent("messages.delete", deletion, EVENT_PRIORITY.CORE);

        try {
            if (deletion.keys) {
                for (const key of deletion.keys) {
                    const chatId = key?.remoteJid;
                    const messageId = key?.id;

                    if (chatId && messageId) {
                        const msgKey = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
                        memoryStore.del(msgKey);
                    }
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles message reactions
     * @listens messages.reaction
     * @param {Object} data - Reaction data
     * @param {Object} data.key - Message key
     * @param {Object} data.reaction - Reaction object
     */
    conn.ev.on("messages.reaction", ({ key, reaction }) => {
        memoryStore.enqueueEvent("messages.reaction", { key, reaction }, EVENT_PRIORITY.AUX);

        try {
            const chatId = key?.remoteJid;
            const messageId = key?.id;

            if (chatId && messageId) {
                const msg = conn.getMessage(chatId, messageId);
                if (msg) {
                    msg.reactions ||= [];
                    msg.reactions.push(reaction);
                    conn.setMessage(chatId, messageId, msg);
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles message receipt updates (read, delivered)
     * @listens message-receipt.update
     * @param {Array<Object>} updates - Array of receipt updates
     */
    conn.ev.on("message-receipt.update", (updates) => {
        memoryStore.enqueueEvent("message-receipt.update", updates, EVENT_PRIORITY.AUX);

        try {
            for (const { key, receipt } of updates) {
                const chatId = key?.remoteJid;
                const messageId = key?.id;

                if (chatId && messageId) {
                    const msg = conn.getMessage(chatId, messageId);
                    if (msg) {
                        msg.userReceipt ||= [];
                        msg.userReceipt.push(receipt);
                        conn.setMessage(chatId, messageId, msg);
                    }
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles chat list updates
     * @listens chats.set
     * @param {Object} data - Chat set data
     * @param {Array<Object>} data.chats - Array of chat objects
     * @param {boolean} data.isLatest - Whether this is the latest chat list
     */
    conn.ev.on("chats.set", ({ chats, isLatest }) => {
        memoryStore.enqueueEvent("chats.set", { chats, isLatest }, EVENT_PRIORITY.CORE);

        try {
            for (const chat of chats) {
                let id = conn.decodeJid(chat.id);
                if (!id || id === "status@broadcast") continue;

                const isGroup = id.endsWith("@g.us");
                const chatData = {
                    id,
                    conversationTimestamp: chat.conversationTimestamp,
                    unreadCount: chat.unreadCount || 0,
                    archived: chat.archived || false,
                    pinned: chat.pinned || 0,
                    muteEndTime: chat.muteEndTime,
                    isChats: !chat.readOnly,
                    ...(isGroup ? { subject: chat.name } : { name: chat.name }),
                };

                conn.setChat(id, chatData);

                // Fetch and store group metadata if applicable
                if (isGroup) {
                    conn.groupMetadata(id)
                        .then((metadata) => {
                            if (metadata) {
                                conn.setGroupMetadata(id, metadata);
                                chatData.metadata = metadata;
                                conn.setChat(id, chatData);
                            }
                        })
                        .catch(() => {});
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles new or updated chats
     * @listens chats.upsert
     * @param {Array<Object>} chats - Array of chat objects
     */
    conn.ev.on("chats.upsert", (chats) => {
        memoryStore.enqueueEvent("chats.upsert", chats, EVENT_PRIORITY.CORE);

        try {
            for (const chat of chats) {
                const id = conn.decodeJid(chat.id);
                if (!id || id === "status@broadcast") continue;

                const existing = conn.getChat(id) || { id };
                const updated = { ...existing, ...chat, isChats: true };

                conn.setChat(id, updated);

                // Fetch and store group metadata if applicable
                if (id.endsWith("@g.us") && !updated.metadata) {
                    conn.groupMetadata(id)
                        .then((metadata) => {
                            if (metadata) {
                                conn.setGroupMetadata(id, metadata);
                                updated.metadata = metadata;
                                conn.setChat(id, updated);
                            }
                        })
                        .catch(() => {});
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles chat metadata updates
     * @listens chats.update
     * @param {Array<Object>} updates - Array of chat updates
     */
    conn.ev.on("chats.update", (updates) => {
        memoryStore.enqueueEvent("chats.update", updates, EVENT_PRIORITY.AUX);

        try {
            for (const update of updates) {
                const id = conn.decodeJid(update.id);
                if (!id || id === "status@broadcast") continue;

                const existing = conn.getChat(id) || { id };
                const updated = { ...existing, ...update };

                conn.setChat(id, updated);
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles chat deletions
     * @listens chats.delete
     * @param {Array<string>} deletions - Array of chat JIDs to delete
     */
    conn.ev.on("chats.delete", (deletions) => {
        memoryStore.enqueueEvent("chats.delete", deletions, EVENT_PRIORITY.NOISE);

        try {
            for (const id of deletions) {
                conn.deleteChat(id);

                // Delete associated messages
                const msgKeys = memoryStore.keys(`${REDIS_MESSAGE_PREFIX}${id}:*`);
                for (const key of msgKeys) {
                    memoryStore.del(key);
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles presence updates (online/offline status)
     * @listens presence.update
     * @param {Object} data - Presence update data
     * @param {string} data.id - Chat ID
     * @param {Object} data.presences - Map of JID to presence data
     */
    conn.ev.on("presence.update", ({ id, presences }) => {
        memoryStore.enqueueEvent("presence.update", { id, presences }, EVENT_PRIORITY.AUX);

        try {
            for (const [jid, presence] of Object.entries(presences)) {
                const _jid = conn.decodeJid(jid);

                conn.setPresence(_jid, {
                    id: _jid,
                    lastKnownPresence: presence.lastKnownPresence,
                    lastSeen: presence.lastSeen,
                    timestamp: Date.now(),
                });

                // Update presence in chat data
                const chat = conn.getChat(_jid);
                if (chat) {
                    chat.presences = presence.lastKnownPresence;
                    conn.setChat(_jid, chat);
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles initial contact list sync
     * @listens contacts.set
     * @param {Object} data - Contact set data
     * @param {Array<Object>} data.contacts - Array of contact objects
     */
    conn.ev.on("contacts.set", ({ contacts }) => {
        memoryStore.enqueueEvent("contacts.set", { contacts }, EVENT_PRIORITY.CORE);

        try {
            for (const contact of contacts) {
                const id = conn.decodeJid(contact.id);
                if (!id || id === "status@broadcast") continue;

                conn.setContact(id, {
                    id,
                    name: contact.name || contact.notify || contact.verifiedName,
                    notify: contact.notify,
                    verifiedName: contact.verifiedName,
                    imgUrl: contact.imgUrl,
                    status: contact.status,
                });

                // Update chat name from contact info
                const chat = conn.getChat(id);
                if (chat && !id.endsWith("@g.us")) {
                    chat.name = contact.name || contact.notify || chat.name;
                    conn.setChat(id, chat);
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles new or updated contacts
     * @listens contacts.upsert
     * @param {Array<Object>} contacts - Array of contact objects
     */
    conn.ev.on("contacts.upsert", (contacts) => {
        memoryStore.enqueueEvent("contacts.upsert", contacts, EVENT_PRIORITY.CORE);

        try {
            for (const contact of contacts) {
                const id = conn.decodeJid(contact.id);
                if (!id || id === "status@broadcast") continue;

                const existing = conn.getContact(id) || { id };
                const updated = { ...existing, ...contact };

                conn.setContact(id, updated);

                // Update chat name from contact info
                const chat = conn.getChat(id);
                if (chat && !id.endsWith("@g.us")) {
                    chat.name = updated.name || updated.notify || chat.name;
                    conn.setChat(id, chat);
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles contact metadata updates
     * @listens contacts.update
     * @param {Array<Object>} updates - Array of contact updates
     */
    conn.ev.on("contacts.update", (updates) => {
        memoryStore.enqueueEvent("contacts.update", updates, EVENT_PRIORITY.AUX);

        try {
            for (const update of updates) {
                const id = conn.decodeJid(update.id);
                if (!id || id === "status@broadcast") continue;

                const existing = conn.getContact(id) || { id };
                const updated = { ...existing, ...update };

                conn.setContact(id, updated);
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles new or updated groups
     * @listens groups.upsert
     * @param {Array<Object>} groups - Array of group objects
     */
    conn.ev.on("groups.upsert", (groups) => {
        memoryStore.enqueueEvent("groups.upsert", groups, EVENT_PRIORITY.CORE);

        try {
            for (const group of groups) {
                const id = conn.decodeJid(group.id);
                if (!id) continue;

                conn.setGroupMetadata(id, group);

                // Update chat with group data
                const chat = conn.getChat(id) || { id };
                chat.subject = group.subject;
                chat.metadata = group;
                chat.isChats = true;
                conn.setChat(id, chat);
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles group metadata updates
     * @listens groups.update
     * @param {Array<Object>} updates - Array of group updates
     */
    conn.ev.on("groups.update", (updates) => {
        memoryStore.enqueueEvent("groups.update", updates, EVENT_PRIORITY.CORE);

        try {
            for (const update of updates) {
                const id = conn.decodeJid(update.id);
                if (!id) continue;

                const existing = conn.getGroupMetadata(id) || { id };
                const updated = { ...existing, ...update };

                conn.setGroupMetadata(id, updated);

                // Update chat with group changes
                const chat = conn.getChat(id);
                if (chat) {
                    if (update.subject) chat.subject = update.subject;
                    chat.metadata = updated;
                    conn.setChat(id, chat);
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles group participant updates
     * @listens group-participants.update
     * @param {Object} data - Participant update data
     * @param {string} data.id - Group JID
     * @param {Array<string>} data.participants - Array of participant JIDs
     * @param {string} data.action - Update action (add, remove, promote, demote)
     */
    conn.ev.on("group-participants.update", ({ id, participants, action }) => {
        memoryStore.enqueueEvent(
            "group-participants.update",
            { id, participants, action },
            EVENT_PRIORITY.CORE
        );

        try {
            id = conn.decodeJid(id);
            if (!id || id === "status@broadcast") return;

            // Refresh group metadata after participant changes
            conn.groupMetadata(id)
                .then((metadata) => {
                    if (metadata) {
                        conn.setGroupMetadata(id, metadata);

                        const chat = conn.getChat(id) || { id };
                        chat.subject = metadata.subject;
                        chat.metadata = metadata;
                        chat.isChats = true;
                        conn.setChat(id, chat);
                    }
                })
                .catch(() => {});
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles call events
     * @listens call
     * @param {Array<Object>} calls - Array of call objects
     */
    conn.ev.on("call", (calls) => {
        memoryStore.enqueueEvent("call", calls, EVENT_PRIORITY.CORE);

        try {
            for (const call of calls) {
                const callId = call.id;
                if (callId) {
                    conn.setCall(callId, {
                        id: callId,
                        from: call.from,
                        timestamp: call.timestamp,
                        isVideo: call.isVideo,
                        isGroup: call.isGroup,
                        status: call.status,
                    });
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles initial blocklist sync
     * @listens blocklist.set
     * @param {Object} data - Blocklist data
     * @param {Array<string>} data.blocklist - Array of blocked JIDs
     */
    conn.ev.on("blocklist.set", ({ blocklist }) => {
        memoryStore.enqueueEvent("blocklist.set", { blocklist }, EVENT_PRIORITY.CORE);

        try {
            conn.setBlocklist(blocklist);
        } catch (e) {
            global.logger?.error(e);
        }
    });

    /**
     * Handles blocklist updates
     * @listens blocklist.update
     * @param {Object} data - Blocklist update data
     * @param {Array<string>} data.blocklist - Array of JIDs to add/remove
     * @param {string} data.type - Update type ("add" or "remove")
     */
    conn.ev.on("blocklist.update", ({ blocklist, type }) => {
        memoryStore.enqueueEvent("blocklist.update", { blocklist, type }, EVENT_PRIORITY.CORE);

        try {
            const existing = conn.getBlocklist();

            if (type === "add") {
                // Add new JIDs to blocklist
                for (const jid of blocklist) {
                    if (!existing.includes(jid)) {
                        existing.push(jid);
                    }
                }
            } else if (type === "remove") {
                // Remove JIDs from blocklist
                const filtered = existing.filter((jid) => !blocklist.includes(jid));
                conn.setBlocklist(filtered);
                return;
            }

            conn.setBlocklist(existing);
        } catch (e) {
            global.logger?.error(e);
        }
    });
}