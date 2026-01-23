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
 * @param {Object} sock - WhatsApp connection object
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
export default function bind(sock) {
    global.logger?.info("Memory store initialized");

    /**
     * Attach memory store instance to connection for direct access
     * @private
     */
    sock._memoryStore = memoryStore;

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
    sock.getChat = (jid) => {
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
    sock.setChat = (jid, data) => {
        const key = `${REDIS_PREFIX}${jid}`;
        memoryStore.atomicSet(key, data, "chat");
    };

    /**
     * Deletes chat data from store
     * @method deleteChat
     * @param {string} jid - Chat JID identifier
     * @returns {void}
     */
    sock.deleteChat = (jid) => {
        const key = `${REDIS_PREFIX}${jid}`;
        memoryStore.del(key);
    };

    /**
     * Retrieves all chats from store
     * @method getAllChats
     * @returns {Array<Object>} Array of chat objects
     */
    sock.getAllChats = () => {
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
    sock.getContact = (jid) => {
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
    sock.setContact = (jid, data) => {
        const key = `${REDIS_CONTACT_PREFIX}${jid}`;
        memoryStore.atomicSet(key, data, "contact");
    };

    /**
     * Retrieves all contacts from store
     * @method getAllContacts
     * @returns {Array<Object>} Array of contact objects
     */
    sock.getAllContacts = () => {
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
    sock.getMessage = (chatId, messageId) => {
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
    sock.setMessage = (chatId, messageId, data) => {
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
    sock.getChatMessages = (chatId, limit = 40) => {
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
    sock.getGroupMetadata = (groupId) => {
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
    sock.setGroupMetadata = (groupId, metadata) => {
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
    sock.getPresence = (jid) => {
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
    sock.setPresence = (jid, presence) => {
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
    sock.getCall = (callId) => {
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
    sock.setCall = (callId, callData) => {
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
    sock.getBlocklist = () => {
        const key = `${REDIS_BLOCKLIST_PREFIX}list`;
        return memoryStore.get(key) || [];
    };

    /**
     * Updates blocklist in store atomically
     * @method setBlocklist
     * @param {Array<string>} blocklist - Array of blocked JIDs
     * @returns {void}
     */
    sock.setBlocklist = (blocklist) => {
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
    sock.ev.on("connection.update", (update) => {
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
    sock.ev.on("creds.update", (update) => {
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
    sock.ev.on("messaging-history.set", ({ chats, contacts, messages, isLatest }) => {
        memoryStore.enqueueEvent(
            "messaging-history.set",
            { chats, contacts, messages, isLatest },
            EVENT_PRIORITY.CORE
        );

        try {
            // Process and store chats
            if (chats) {
                for (const chat of chats) {
                    const id = sock.decodeJid(chat.id);
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
                        sock.groupMetadata(id)
                            .then((metadata) => {
                                if (metadata) {
                                    sock.setGroupMetadata(id, metadata);
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
                    const id = sock.decodeJid(contact.id);
                    if (!id || id === "status@broadcast") continue;

                    sock.setContact(id, {
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
                            sock.setMessage(chatId, messageId, msg);
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
    sock.ev.on("messages.upsert", ({ messages, type }) => {
        memoryStore.enqueueEvent("messages.upsert", { messages, type }, EVENT_PRIORITY.CORE);

        try {
            for (const msg of messages) {
                const chatId = msg.key?.remoteJid;
                const messageId = msg.key?.id;

                if (!chatId || !messageId || chatId === "status@broadcast") continue;

                sock.setMessage(chatId, messageId, msg);

                // Update chat metadata
                let chat = sock.getChat(chatId) || { id: chatId };
                chat.conversationTimestamp = msg.messageTimestamp;
                chat.isChats = true;

                if (!msg.key?.fromMe) {
                    chat.unreadCount = (chat.unreadCount || 0) + 1;
                }

                sock.setChat(chatId, chat);
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
    sock.ev.on("messages.update", (updates) => {
        memoryStore.enqueueEvent("messages.update", updates, EVENT_PRIORITY.CORE);

        try {
            for (const { key, update } of updates) {
                const chatId = key?.remoteJid;
                const messageId = key?.id;

                if (!chatId || !messageId) continue;

                const msg = sock.getMessage(chatId, messageId);
                if (msg) {
                    Object.assign(msg, update);
                    sock.setMessage(chatId, messageId, msg);
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
    sock.ev.on("messages.delete", (deletion) => {
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
    sock.ev.on("messages.reaction", ({ key, reaction }) => {
        memoryStore.enqueueEvent("messages.reaction", { key, reaction }, EVENT_PRIORITY.AUX);

        try {
            const chatId = key?.remoteJid;
            const messageId = key?.id;

            if (chatId && messageId) {
                const msg = sock.getMessage(chatId, messageId);
                if (msg) {
                    msg.reactions ||= [];
                    msg.reactions.push(reaction);
                    sock.setMessage(chatId, messageId, msg);
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
    sock.ev.on("message-receipt.update", (updates) => {
        memoryStore.enqueueEvent("message-receipt.update", updates, EVENT_PRIORITY.AUX);

        try {
            for (const { key, receipt } of updates) {
                const chatId = key?.remoteJid;
                const messageId = key?.id;

                if (chatId && messageId) {
                    const msg = sock.getMessage(chatId, messageId);
                    if (msg) {
                        msg.userReceipt ||= [];
                        msg.userReceipt.push(receipt);
                        sock.setMessage(chatId, messageId, msg);
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
    sock.ev.on("chats.set", ({ chats, isLatest }) => {
        memoryStore.enqueueEvent("chats.set", { chats, isLatest }, EVENT_PRIORITY.CORE);

        try {
            for (const chat of chats) {
                let id = sock.decodeJid(chat.id);
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

                sock.setChat(id, chatData);

                // Fetch and store group metadata if applicable
                if (isGroup) {
                    sock.groupMetadata(id)
                        .then((metadata) => {
                            if (metadata) {
                                sock.setGroupMetadata(id, metadata);
                                chatData.metadata = metadata;
                                sock.setChat(id, chatData);
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
    sock.ev.on("chats.upsert", (chats) => {
        memoryStore.enqueueEvent("chats.upsert", chats, EVENT_PRIORITY.CORE);

        try {
            for (const chat of chats) {
                const id = sock.decodeJid(chat.id);
                if (!id || id === "status@broadcast") continue;

                const existing = sock.getChat(id) || { id };
                const updated = { ...existing, ...chat, isChats: true };

                sock.setChat(id, updated);

                // Fetch and store group metadata if applicable
                if (id.endsWith("@g.us") && !updated.metadata) {
                    sock.groupMetadata(id)
                        .then((metadata) => {
                            if (metadata) {
                                sock.setGroupMetadata(id, metadata);
                                updated.metadata = metadata;
                                sock.setChat(id, updated);
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
    sock.ev.on("chats.update", (updates) => {
        memoryStore.enqueueEvent("chats.update", updates, EVENT_PRIORITY.AUX);

        try {
            for (const update of updates) {
                const id = sock.decodeJid(update.id);
                if (!id || id === "status@broadcast") continue;

                const existing = sock.getChat(id) || { id };
                const updated = { ...existing, ...update };

                sock.setChat(id, updated);
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
    sock.ev.on("chats.delete", (deletions) => {
        memoryStore.enqueueEvent("chats.delete", deletions, EVENT_PRIORITY.NOISE);

        try {
            for (const id of deletions) {
                sock.deleteChat(id);

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
    sock.ev.on("presence.update", ({ id, presences }) => {
        memoryStore.enqueueEvent("presence.update", { id, presences }, EVENT_PRIORITY.AUX);

        try {
            for (const [jid, presence] of Object.entries(presences)) {
                const _jid = sock.decodeJid(jid);

                sock.setPresence(_jid, {
                    id: _jid,
                    lastKnownPresence: presence.lastKnownPresence,
                    lastSeen: presence.lastSeen,
                    timestamp: Date.now(),
                });

                // Update presence in chat data
                const chat = sock.getChat(_jid);
                if (chat) {
                    chat.presences = presence.lastKnownPresence;
                    sock.setChat(_jid, chat);
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
    sock.ev.on("contacts.set", ({ contacts }) => {
        memoryStore.enqueueEvent("contacts.set", { contacts }, EVENT_PRIORITY.CORE);

        try {
            for (const contact of contacts) {
                const id = sock.decodeJid(contact.id);
                if (!id || id === "status@broadcast") continue;

                sock.setContact(id, {
                    id,
                    name: contact.name || contact.notify || contact.verifiedName,
                    notify: contact.notify,
                    verifiedName: contact.verifiedName,
                    imgUrl: contact.imgUrl,
                    status: contact.status,
                });

                // Update chat name from contact info
                const chat = sock.getChat(id);
                if (chat && !id.endsWith("@g.us")) {
                    chat.name = contact.name || contact.notify || chat.name;
                    sock.setChat(id, chat);
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
    sock.ev.on("contacts.upsert", (contacts) => {
        memoryStore.enqueueEvent("contacts.upsert", contacts, EVENT_PRIORITY.CORE);

        try {
            for (const contact of contacts) {
                const id = sock.decodeJid(contact.id);
                if (!id || id === "status@broadcast") continue;

                const existing = sock.getContact(id) || { id };
                const updated = { ...existing, ...contact };

                sock.setContact(id, updated);

                // Update chat name from contact info
                const chat = sock.getChat(id);
                if (chat && !id.endsWith("@g.us")) {
                    chat.name = updated.name || updated.notify || chat.name;
                    sock.setChat(id, chat);
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
    sock.ev.on("contacts.update", (updates) => {
        memoryStore.enqueueEvent("contacts.update", updates, EVENT_PRIORITY.AUX);

        try {
            for (const update of updates) {
                const id = sock.decodeJid(update.id);
                if (!id || id === "status@broadcast") continue;

                const existing = sock.getContact(id) || { id };
                const updated = { ...existing, ...update };

                sock.setContact(id, updated);
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
    sock.ev.on("groups.upsert", (groups) => {
        memoryStore.enqueueEvent("groups.upsert", groups, EVENT_PRIORITY.CORE);

        try {
            for (const group of groups) {
                const id = sock.decodeJid(group.id);
                if (!id) continue;

                sock.setGroupMetadata(id, group);

                // Update chat with group data
                const chat = sock.getChat(id) || { id };
                chat.subject = group.subject;
                chat.metadata = group;
                chat.isChats = true;
                sock.setChat(id, chat);
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
    sock.ev.on("groups.update", (updates) => {
        memoryStore.enqueueEvent("groups.update", updates, EVENT_PRIORITY.CORE);

        try {
            for (const update of updates) {
                const id = sock.decodeJid(update.id);
                if (!id) continue;

                const existing = sock.getGroupMetadata(id) || { id };
                const updated = { ...existing, ...update };

                sock.setGroupMetadata(id, updated);

                // Update chat with group changes
                const chat = sock.getChat(id);
                if (chat) {
                    if (update.subject) chat.subject = update.subject;
                    chat.metadata = updated;
                    sock.setChat(id, chat);
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
    sock.ev.on("group-participants.update", ({ id, participants, action }) => {
        memoryStore.enqueueEvent(
            "group-participants.update",
            { id, participants, action },
            EVENT_PRIORITY.CORE
        );

        try {
            id = sock.decodeJid(id);
            if (!id || id === "status@broadcast") return;

            // Refresh group metadata after participant changes
            sock.groupMetadata(id)
                .then((metadata) => {
                    if (metadata) {
                        sock.setGroupMetadata(id, metadata);

                        const chat = sock.getChat(id) || { id };
                        chat.subject = metadata.subject;
                        chat.metadata = metadata;
                        chat.isChats = true;
                        sock.setChat(id, chat);
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
    sock.ev.on("call", (calls) => {
        memoryStore.enqueueEvent("call", calls, EVENT_PRIORITY.CORE);

        try {
            for (const call of calls) {
                const callId = call.id;
                if (callId) {
                    sock.setCall(callId, {
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
    sock.ev.on("blocklist.set", ({ blocklist }) => {
        memoryStore.enqueueEvent("blocklist.set", { blocklist }, EVENT_PRIORITY.CORE);

        try {
            sock.setBlocklist(blocklist);
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
    sock.ev.on("blocklist.update", ({ blocklist, type }) => {
        memoryStore.enqueueEvent("blocklist.update", { blocklist, type }, EVENT_PRIORITY.CORE);

        try {
            const existing = sock.getBlocklist();

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
                sock.setBlocklist(filtered);
                return;
            }

            sock.setBlocklist(existing);
        } catch (e) {
            global.logger?.error(e);
        }
    });
}
