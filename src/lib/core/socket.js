/**
 * @file Socket wrapper and connection management for Liora bot
 * @module core/socket
 * @description Enhanced WhatsApp WebSocket wrapper with message queueing,
 * connection utilities, and message processing pipeline.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import bind from "./store/store.js";
import { mods } from "./mod.js";
import {
    makeWASocket,
    areJidsSameUser,
    WAMessageStubType,
    downloadContentFromMessage,
} from "baileys";

const isGroupJid = (id) => id && id.endsWith("@g.us");
const isStatusJid = (id) => !id || id === "status@broadcast";

const decodeJid = (raw) => {
    if (!raw || typeof raw !== "string") return raw || null;
    const cleaned = raw.replace(/:\d+@/, "@");
    return cleaned.includes("@")
        ? cleaned
        : /^[0-9]+$/.test(cleaned)
          ? cleaned + "@s.whatsapp.net"
          : cleaned;
};

class MessageQueue {
    constructor() {
        this.tasks = [];
        this.running = false;
        this.batchSize = 10;
        this.disposed = false;
    }

    add(task) {
        if (this.disposed) return;

        this.tasks.push(task);
        if (!this.running) {
            this.running = true;
            setImmediate(() => this.process());
        }
    }

    async process() {
        while (this.tasks.length > 0 && !this.disposed) {
            const batch = this.tasks.splice(0, this.batchSize);
            await Promise.all(
                batch.map((task) => task().catch(() => {}))
            );
        }
        this.running = false;
    }

    dispose() {
        this.disposed = true;
        this.tasks = [];
        this.running = false;
    }
}

const messageQueue = new MessageQueue();

export function naruyaizumi(connectionOptions) {
    const sock = makeWASocket(connectionOptions);

    bind(sock);

    sock.decodeJid = decodeJid;

    const sender = new mods(sock);
    sock.client = sender.client.bind(sender);

    sock.reply = async (jid, text = "", quoted, options = {}) => {
        let ephemeral = false;
        try {
            const chat = await sock.getChat(jid);
            ephemeral = chat?.metadata?.ephemeralDuration || chat?.ephemeralDuration || false;
        } catch {
            // Silent fail
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

    sock.processMessageStubType = async (m) => {
        if (!m?.messageStubType) return;

        const chat = sock.decodeJid(
            m.key?.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || ""
        );

        if (!chat || isStatusJid(chat)) return;
    };

    sock.pushMessage = (m) => {
        if (!m) return;

        const messages = Array.isArray(m) ? m : [m];

        messages.forEach((message) => {
            messageQueue.add(async () => {
                try {
                    if (
                        message.messageStubType &&
                        message.messageStubType !== WAMessageStubType.CIPHERTEXT
                    ) {
                        await sock.processMessageStubType(message);
                    }

                    const msgObj = message.message || {};
                    const mtypeKeys = Object.keys(msgObj);
                    if (!mtypeKeys.length) return;

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

                    let chatData = await sock.getChat(chat);
                    if (!chatData) {
                        chatData = { id: chat, isChats: true };
                    }

                    const isGroup = isGroupJid(chat);

                    if (isGroup && !chatData.metadata) {
                        try {
                            const md = await sock.groupMetadata(chat);
                            chatData.subject = md.subject;
                            chatData.metadata = md;
                        } catch {
                            // Silent fail
                        }
                    }

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
                } catch {
                    // Silent fail
                }
            });
        });
    };

    if (sock.user?.lid) {
        sock.user.lid = sock.decodeJid(sock.user.lid);
    }

    return sock;
}

