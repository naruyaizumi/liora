/**
 * @file Socket wrapper and connection management for Liora bot
 * @module core/socket
 * @description Enhanced WhatsApp WebSocket wrapper with message queueing,
 * connection utilities, and message processing pipeline.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import bind from "./store/store.js";
import { smsg } from "./smsg.js";
import { mods } from "./mod.js";
import {
    makeWASocket,
    areJidsSameUser,
    WAMessageStubType,
    downloadContentFromMessage,
} from "baileys";

/**
 * Checks if JID belongs to a group chat
 * @function isGroupJid
 * @param {string} id - JID to check
 * @returns {boolean} True if group JID
 */
const isGroupJid = (id) => id && id.endsWith("@g.us");

/**
 * Checks if JID is a status broadcast
 * @function isStatusJid
 * @param {string} id - JID to check
 * @returns {boolean} True if status JID
 */
const isStatusJid = (id) => !id || id === "status@broadcast";

/**
 * Decodes and normalizes JID formats
 * @function decodeJid
 * @param {string} raw - Raw JID string
 * @returns {string|null} Normalized JID or null
 * @example
 * decodeJid("1234567890@s.whatsapp.net") // "1234567890@s.whatsapp.net"
 * decodeJid("1234567890:0@s.whatsapp.net") // "1234567890@s.whatsapp.net"
 * decodeJid("1234567890") // "1234567890@s.whatsapp.net"
 */
const decodeJid = (raw) => {
    if (!raw || typeof raw !== "string") return raw || null;
    const cleaned = raw.replace(/:\d+@/, "@");
    return cleaned.includes("@")
        ? cleaned
        : /^[0-9]+$/.test(cleaned)
          ? cleaned + "@s.whatsapp.net"
          : cleaned;
};

/**
 * Asynchronous message queue for processing incoming messages
 * @class MessageQueue
 * @description Batches message processing to prevent overload
 */
class MessageQueue {
    /**
     * Creates new message queue
     * @constructor
     */
    constructor() {
        this.tasks = [];
        this.running = false;
        this.batchSize = 10;
    }

    /**
     * Adds task to queue
     * @method add
     * @param {Function} task - Async function to execute
     */
    add(task) {
        this.tasks.push(task);
        if (!this.running) {
            this.running = true;
            setImmediate(() => this.process());
        }
    }

    /**
     * Processes queued tasks in batches
     * @async
     * @method process
     */
    async process() {
        while (this.tasks.length > 0) {
            const batch = this.tasks.splice(0, this.batchSize);
            await Promise.all(
                batch.map((task) =>
                    task().catch((e) => global.logger?.error({ error: e.message }, "Queue error"))
                )
            );
        }
        this.running = false;
    }
}

/**
 * Global message queue instance
 * @constant {MessageQueue}
 */
const messageQueue = new MessageQueue();

/**
 * Creates enhanced WhatsApp socket connection
 * @export
 * @function naruyaizumi
 * @param {Object} connectionOptions - Baileys socket options
 * @returns {Object} Enhanced connection object
 *
 * @features
 * - Message queue for batched processing
 * - Automatic JID normalization
 * - Media download utilities
 * - Group metadata management
 * - Message persistence and caching
 * - Enhanced reply system with ephemeral support
 *
 * @performance
 * - Batched message processing (10 messages/batch)
 * - Async group metadata fetching
 * - Efficient media streaming with chunk aggregation
 * - Automatic connection state management
 */
export function naruyaizumi(connectionOptions) {
    const sock = makeWASocket(connectionOptions);

    // Bind store management
    bind(sock);

    // JID utilities
    sock.decodeJid = decodeJid;

    // Message sending utilities
    const sender = new mods(sock);
    sock.client = sender.client.bind(sender);

    /**
     * Enhanced reply method with ephemeral support
     * @async
     * @method reply
     * @param {string} jid - Target JID
     * @param {string} text - Message text
     * @param {Object} quoted - Quoted message
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Message send result
     */
    sock.reply = async (jid, text = "", quoted, options = {}) => {
        let ephemeral = false;
        try {
            const chat = await sock.getChat(jid);
            ephemeral = chat?.metadata?.ephemeralDuration || chat?.ephemeralDuration || false;
        } catch (e) {
            global.logger?.error({ error: e.message, jid }, "getChat error");
        }

        text = typeof text === "string" ? text.trim() : String(text || "");

        return sock.sendMessage(
            jid,
            {
                text,
                ...options,
            },
            {
                quoted,
                ephemeralExpiration: ephemeral,
            }
        );
    };

    /**
     * Downloads media from message with chunk aggregation
     * @async
     * @method downloadM
     * @param {Object} m - Media message object
     * @param {string} type - Media type
     * @returns {Promise<Buffer>} Media buffer
     */
    sock.downloadM = async (m, type) => {
        if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);

        try {
            const stream = await downloadContentFromMessage(m, type);
            const chunks = [];

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            return Buffer.concat(chunks);
        } catch {
            return Buffer.alloc(0);
        }
    };

    /**
     * Gets display name for JID with caching
     * @async
     * @method getName
     * @param {string} jid - Target JID
     * @param {boolean} withoutContact - Skip contact resolution
     * @returns {Promise<string>} Display name
     */
    sock.getName = async (jid = "", withoutContact = false) => {
        jid = sock.decodeJid(jid);
        if (!jid || withoutContact) return jid || "";

        if (isGroupJid(jid)) {
            try {
                const chat = await sock.getChat(jid);
                if (chat?.subject) return chat.subject;

                const md = await sock.groupMetadata(jid);
                if (md?.subject) {
                    sock.setChat(jid, {
                        ...(chat || { id: jid }),
                        subject: md.subject,
                        metadata: md,
                    }).catch(() => {});
                    return md.subject;
                }
            } catch {
                return jid;
            }
        }

        const self =
            sock.user?.lid && areJidsSameUser ? areJidsSameUser(jid, sock.user.lid) : false;

        if (self) return sock.user?.name || jid;

        try {
            const chat = await sock.getChat(jid);
            return chat?.name || chat?.notify || jid;
        } catch {
            return jid;
        }
    };

    /**
     * Loads message from chat cache by ID
     * @async
     * @method loadMessage
     * @param {string} messageID - Message identifier
     * @returns {Promise<Object|null>} Message object or null
     */
    sock.loadMessage = async (messageID) => {
        if (!messageID) return null;

        try {
            const allChats = await sock.getAllChats();
            for (const chatData of allChats) {
                const msg = chatData?.messages?.[messageID];
                if (msg) return msg;
            }
        } catch (e) {
            global.logger?.error({ error: e.message }, "loadMessage error");
        }

        return null;
    };

    /**
     * Processes WhatsApp protocol message stubs
     * @async
     * @method processMessageStubType
     * @param {Object} m - Message object
     */
    sock.processMessageStubType = async (m) => {
        if (!m?.messageStubType) return;

        const chat = sock.decodeJid(
            m.key?.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || ""
        );

        if (!chat || isStatusJid(chat)) return;

        const name =
            Object.entries(WAMessageStubType).find(([, v]) => v === m.messageStubType)?.[0] ||
            "UNKNOWN";

        const author = sock.decodeJid(
            m.key?.participant || m.participant || m.key?.remoteJid || ""
        );

        global.logger?.warn({
            module: "PROTOCOL",
            event: name,
            chat,
            author,
            params: m.messageStubParameters || [],
        });
    };

    /**
     * Bulk inserts all participating groups into cache
     * @async
     * @method insertAllGroup
     * @returns {Promise<Object>} Groups metadata
     */
    sock.insertAllGroup = async () => {
        try {
            const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));

            if (!allGroups || typeof allGroups !== "object") {
                return {};
            }

            const groupEntries = Object.entries(allGroups);
            const batchSize = 10;

            for (let i = 0; i < groupEntries.length; i += batchSize) {
                const batch = groupEntries.slice(i, i + batchSize);

                await Promise.all(
                    batch.map(async ([gid, meta]) => {
                        if (!isGroupJid(gid)) return;

                        const chat = {
                            id: gid,
                            subject: meta.subject || "",
                            metadata: meta,
                            isChats: true,
                            lastSync: Date.now(),
                        };

                        await sock.setChat(gid, chat);
                    })
                );
            }

            return allGroups;
        } catch (e) {
            global.logger?.error(e);
            return {};
        }
    };

    /**
     * Processes and stores incoming messages
     * @method pushMessage
     * @param {Object|Array} m - Message(s) to process
     *
     * @processingPipeline
     * 1. Protocol stub processing
     * 2. Message type detection
     * 3. Chat metadata resolution
     * 4. Quoted message caching
     * 5. Sender information updating
     * 6. Message persistence
     *
     * @storage
     * - Messages: 15 per chat (sliding window)
     * - Quoted messages: 20 per chat
     * - Automatic cleanup of old entries
     */
    sock.pushMessage = (m) => {
        if (!m) return;

        const messages = Array.isArray(m) ? m : [m];

        messages.forEach((message) => {
            messageQueue.add(async () => {
                try {
                    // Process protocol messages
                    if (
                        message.messageStubType &&
                        message.messageStubType !== WAMessageStubType.CIPHERTEXT
                    ) {
                        await sock.processMessageStubType(message);
                    }

                    const msgObj = message.message || {};
                    const mtypeKeys = Object.keys(msgObj);
                    if (!mtypeKeys.length) return;

                    // Determine message type
                    let mtype = mtypeKeys.find(
                        (k) => k !== "senderKeyDistributionMessage" && k !== "messageContextInfo"
                    );
                    if (!mtype) mtype = mtypeKeys[mtypeKeys.length - 1];

                    const chat = sock.decodeJid(
                        message.key?.remoteJid ||
                            msgObj?.senderKeyDistributionMessage?.groupId ||
                            ""
                    );

                    if (!chat || isStatusJid(chat)) return;

                    // Get or create chat data
                    let chatData = await sock.getChat(chat);
                    if (!chatData) {
                        chatData = { id: chat, isChats: true };
                    }

                    const isGroup = isGroupJid(chat);

                    // Fetch group metadata if missing
                    if (isGroup && !chatData.metadata) {
                        try {
                            const md = await sock.groupMetadata(chat);
                            chatData.subject = md.subject;
                            chatData.metadata = md;
                        } catch {
                            // Silent fail
                        }
                    }

                    // Cache quoted messages
                    const ctx = msgObj[mtype]?.contextInfo;
                    if (ctx?.quotedMessage && ctx.stanzaId) {
                        const qChat = sock.decodeJid(ctx.remoteJid || ctx.participant || chat);

                        if (qChat && !isStatusJid(qChat)) {
                            try {
                                let qm = await sock.getChat(qChat);
                                if (!qm) {
                                    qm = { id: qChat, isChats: !isGroupJid(qChat) };
                                }

                                qm.messages ||= {};

                                if (!qm.messages[ctx.stanzaId]) {
                                    const quotedMsg = {
                                        key: {
                                            remoteJid: qChat,
                                            fromMe:
                                                sock.user?.lid && areJidsSameUser
                                                    ? areJidsSameUser(sock.user.lid, qChat)
                                                    : false,
                                            id: ctx.stanzaId,
                                            participant: sock.decodeJid(ctx.participant),
                                        },
                                        message: ctx.quotedMessage,
                                        ...(qChat.endsWith("@g.us")
                                            ? {
                                                  participant: sock.decodeJid(ctx.participant),
                                              }
                                            : {}),
                                    };

                                    qm.messages[ctx.stanzaId] = quotedMsg;

                                    // Maintain sliding window of 20 messages
                                    const msgKeys = Object.keys(qm.messages);
                                    if (msgKeys.length > 30) {
                                        for (let i = 0; i < msgKeys.length - 20; i++) {
                                            delete qm.messages[msgKeys[i]];
                                        }
                                    }

                                    await sock.setChat(qChat, qm);
                                }
                            } catch {
                                // Silent fail
                            }
                        }
                    }

                    // Update sender information
                    if (!isGroup) {
                        chatData.name = message.pushName || chatData.name || "";
                    } else {
                        const s = sock.decodeJid(
                            (message.key?.fromMe && sock.user?.lid) ||
                                message.participant ||
                                message.key?.participant ||
                                chat
                        );

                        if (s && s !== chat) {
                            try {
                                const sChat = (await sock.getChat(s)) || { id: s };
                                sChat.name = message.pushName || sChat.name || "";
                                await sock.setChat(s, sChat);
                            } catch {
                                // Silent fail
                            }
                        }
                    }

                    // Store non-bot messages (15 message sliding window)
                    if (mtype !== "senderKeyDistributionMessage") {
                        const s = isGroup
                            ? sock.decodeJid(
                                  (message.key?.fromMe && sock.user?.lid) ||
                                      message.participant ||
                                      message.key?.participant ||
                                      chat
                              )
                            : message.key?.fromMe && sock.user?.lid
                              ? sock.user.lid
                              : chat;

                        const fromMe =
                            message.key?.fromMe ||
                            (sock.user?.lid && s && areJidsSameUser
                                ? areJidsSameUser(s, sock.user?.lid)
                                : false);

                        if (
                            !fromMe &&
                            message.message &&
                            message.messageStubType !== WAMessageStubType.CIPHERTEXT &&
                            message.key?.id
                        ) {
                            const cleanMsg = { ...message };
                            if (cleanMsg.message) {
                                delete cleanMsg.message.messageContextInfo;
                                delete cleanMsg.message.senderKeyDistributionMessage;
                            }

                            chatData.messages ||= {};
                            chatData.messages[message.key.id] = cleanMsg;

                            const msgKeys = Object.keys(chatData.messages);
                            if (msgKeys.length > 20) {
                                for (let i = 0; i < msgKeys.length - 15; i++) {
                                    delete chatData.messages[msgKeys[i]];
                                }
                            }
                        }
                    }

                    await sock.setChat(chat, chatData);
                } catch (e) {
                    global.logger?.error({ error: e.message }, "pushMessage error");
                }
            });
        });
    };

    /**
     * Serializes message using smsg utility
     * @method serializeM
     * @param {Object} m - Message object
     * @returns {Object} Serialized message
     */
    sock.serializeM = (m) => smsg(sock, m);

    // Normalize bot's own LID
    if (sock.user?.lid) {
        sock.user.lid = sock.decodeJid(sock.user.lid);
    }

    return sock;
}
