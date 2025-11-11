import pino from "pino";
import store from "../utils/store/store.js";
import { smsg } from "./smsg.js";
import {
    makeWASocket,
    areJidsSameUser,
    WAMessageStubType,
    downloadContentFromMessage,
    generateWAMessageFromContent,
    generateWAMessage,
} from "baileys";
import { randomBytes } from "crypto";

const loggerInstance = pino({
    level: "debug",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const _isStr = (v) => typeof v === "string";
const _now = () => Date.now();
const _isStatusJid = (id) => !id || id === "status@broadcast";
const _isGroupJid = (id = "") => id && id.endsWith("@g.us");

const _capMap = (obj, max, keep) => {
    const keys = Object.keys(obj);
    if (keys.length <= max) return;
    const nRemove = Math.max(0, keys.length - keep);
    for (let i = 0; i < nRemove; i++) delete obj[keys[i]];
};

const _hidden = (target, key, value) =>
    Object.defineProperty(target, key, {
        value,
        enumerable: false,
        configurable: false,
        writable: true,
    });

const _decodeCache = new Map();
const MAX_CACHE_SIZE = 1000;

const _decode = (raw) => {
    if (!raw || typeof raw !== "string") return raw || null;
    if (_decodeCache.has(raw)) return _decodeCache.get(raw);
    const cleaned = raw.replace(/:\d+@/, "@");
    const norm = cleaned.includes("@")
        ? cleaned
        : /^[0-9]+$/.test(cleaned)
          ? cleaned + "@s.whatsapp.net"
          : cleaned;

    if (_decodeCache.size >= MAX_CACHE_SIZE) {
        const firstKey = _decodeCache.keys().next().value;
        _decodeCache.delete(firstKey);
    }

    _decodeCache.set(raw, norm);
    return norm;
};

const _cleanupMsgIndex = (msgIndex, maxSize = 5000) => {
    if (msgIndex.size > maxSize) {
        const toDelete = msgIndex.size - maxSize;
        const iterator = msgIndex.keys();
        for (let i = 0; i < toDelete; i++) {
            const key = iterator.next().value;
            if (key) msgIndex.delete(key);
        }
    }
};

export function naruyaizumi(connectionOptions, options = {}) {
    const conn = makeWASocket(connectionOptions);
    _hidden(conn, "_msgIndex", new Map());

    Object.defineProperties(conn, {
        chats: {
            value: { ...(options.chats || {}) },
            writable: true,
        },
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== "string") return jid || null;
                return _decode(jid);
            },
        },
        logger: {
            get() {
                const log = (level, args) => {
                    switch (level) {
                        case "info":
                            loggerInstance.info(...args);
                            break;
                        case "warn":
                            loggerInstance.warn(...args);
                            break;
                        case "error":
                            loggerInstance.error(...args);
                            break;
                        case "debug":
                            loggerInstance.debug(...args);
                            break;
                        case "trace":
                            loggerInstance.trace?.(...args);
                            break;
                        default:
                            loggerInstance.info(...args);
                    }
                };

                return {
                    info: (...a) => log("info", a),
                    error: (...a) => log("error", a),
                    warn: (...a) => log("warn", a),
                    trace: (...a) => log("trace", a),
                    debug: (...a) => log("debug", a),
                };
            },
            enumerable: true,
        },
        sendAlbum: {
            async value(jid, items = [], options = {}) {
                try {
                    if (!this.user?.id) {
                        throw new Error("User not authenticated");
                    }

                    const messageContent = {
                        messageContextInfo: {
                            messageSecret: randomBytes(32),
                        },
                        albumMessage: {
                            expectedImageCount: items.filter((a) => a?.image).length,
                            expectedVideoCount: items.filter((a) => a?.video).length,
                        },
                    };

                    const generationOptions = {
                        userJid: this.user.id,
                        upload: this.waUploadToServer,
                        quoted: options?.quoted || null,
                        ephemeralExpiration: options?.quoted?.expiration ?? 0,
                    };

                    const album = generateWAMessageFromContent(
                        jid,
                        messageContent,
                        generationOptions
                    );

                    await this.relayMessage(album.key.remoteJid, album.message, {
                        messageId: album.key.id,
                    });

                    for (const content of items) {
                        const mediaMsg = await generateWAMessage(album.key.remoteJid, content, {
                            upload: this.waUploadToServer,
                            ephemeralExpiration: options?.quoted?.expiration ?? 0,
                        });

                        mediaMsg.message.messageContextInfo = {
                            messageSecret: randomBytes(32),
                            messageAssociation: {
                                associationType: 1,
                                parentMessageKey: album.key,
                            },
                        };

                        await this.relayMessage(mediaMsg.key.remoteJid, mediaMsg.message, {
                            messageId: mediaMsg.key.id,
                        });
                    }

                    return album;
                } catch (e) {
                    conn.logger.error(e);
                    throw e;
                }
            },
            enumerable: true,
        },
        reply: {
            async value(jid, text = "", quoted, options = {}) {
                const ephemeral =
                    conn.chats[jid]?.metadata?.ephemeralDuration ||
                    conn.chats[jid]?.ephemeralDuration ||
                    false;
                const thumbs = [
                    "https://qu.ax/PunKN.jpg",
                    "https://qu.ax/NQXEK.jpg",
                    "https://qu.ax/sdMjK.jpg",
                    "https://qu.ax/uSgKa.jpg",
                    "https://qu.ax/YsDxU.jpg",
                ];
                const thumb = thumbs[Math.floor(Math.random() * thumbs.length)];

                if (_isStr(text)) {
                    text = text.trim();
                } else {
                    text = String(text || "");
                }

                if (global.db?.data?.settings?.[conn.user?.jid]?.adReply) {
                    return conn.sendMessage(
                        jid,
                        {
                            text,
                            contextInfo: {
                                externalAdReply: {
                                    title: global.config?.watermark || "",
                                    body: global.config?.author || "",
                                    thumbnailUrl: thumb,
                                    mediaType: 1,
                                    renderLargerThumbnail: false,
                                },
                            },
                            ...options,
                        },
                        {
                            quoted,
                            ephemeralExpiration: ephemeral,
                        }
                    );
                } else {
                    return conn.sendMessage(
                        jid,
                        { text, ...options },
                        {
                            quoted,
                            ephemeralExpiration: ephemeral,
                        }
                    );
                }
            },
            enumerable: true,
        },
        downloadM: {
            async value(m, type) {
                if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);

                const stream = await downloadContentFromMessage(m, type);
                const sink = new Bun.ArrayBufferSink();

                for await (const chunk of stream) {
                    sink.write(chunk);
                }
                return Buffer.from(sink.end());
            },
            enumerable: true,
        },
        getName: {
            value: async function (jid = "", withoutContact = false) {
                jid = conn.decodeJid(jid);
                withoutContact = conn.withoutContact || withoutContact;

                if (!jid) return "";

                if (_isGroupJid(jid)) {
                    const c = conn.chats[jid] || {};
                    if (c.subject) return c.subject;

                    try {
                        const md = await conn.groupMetadata(jid);
                        return md?.subject || c.name || jid;
                    } catch {
                        return c.name || jid;
                    }
                }

                const self =
                    conn.user?.lid && areJidsSameUser ? areJidsSameUser(jid, conn.user.lid) : false;

                const v =
                    jid === "12066409886@s.whatsapp.net"
                        ? {
                              jid,
                              vname: "WhatsApp",
                          }
                        : self
                          ? conn.user
                          : conn.chats[jid] || {};

                const name = v.name || v.vname || v.notify || v.verifiedName || v.subject;
                return withoutContact ? "" : name || jid;
            },
            enumerable: true,
        },
        loadMessage: {
            value(messageID) {
                if (!messageID) return null;
                const hit = conn._msgIndex.get(messageID);
                if (hit) return hit;

                for (const chatData of Object.values(conn.chats || {})) {
                    const messages = chatData?.messages;
                    if (!messages || typeof messages !== "object") continue;

                    if (messages[messageID]) {
                        conn._msgIndex.set(messageID, messages[messageID]);
                        return messages[messageID];
                    }
                }
                return null;
            },
            enumerable: true,
        },
        Pairing: {
            value: String.fromCharCode(67, 85, 77, 73, 67, 85, 77, 73),
            writable: false,
            enumerable: true,
        },
        processMessageStubType: {
            async value(m) {
                if (!m?.messageStubType) return;

                const chat = conn.decodeJid(
                    m.key?.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || ""
                );

                if (!chat || _isStatusJid(chat)) return;

                const name =
                    Object.entries(WAMessageStubType).find(
                        ([, v]) => v === m.messageStubType
                    )?.[0] || "UNKNOWN";

                const author = conn.decodeJid(
                    m.key?.participant || m.participant || m.key?.remoteJid || ""
                );

                const params = m.messageStubParameters || [];

                conn.logger.warn({
                    module: "PROTOCOL",
                    event: name,
                    chat,
                    author,
                    params,
                });
            },
            enumerable: true,
        },
        insertAllGroup: {
            async value() {
                try {
                    const allGroups = await conn.groupFetchAllParticipating().catch(() => ({}));

                    if (!allGroups || typeof allGroups !== "object") {
                        return conn.chats || {};
                    }

                    const existing = conn.chats || (conn.chats = Object.create(null));
                    const now = _now();

                    for (const [gid, meta] of Object.entries(allGroups)) {
                        if (!_isGroupJid(gid)) continue;

                        const chat = (existing[gid] ||= { id: gid });

                        if (chat.subject !== meta.subject) {
                            chat.subject = meta.subject || chat.subject || "";
                        }

                        chat.metadata = meta;
                        chat.isChats = true;
                        chat.lastSync = now;
                    }
                    for (const jid in existing) {
                        if (_isGroupJid(jid) && !allGroups[jid] && existing[jid].lastSync !== now) {
                            delete existing[jid];
                        }
                    }

                    return existing;
                } catch (e) {
                    conn.logger.error(e);
                    return conn.chats || {};
                }
            },
            enumerable: true,
        },
        pushMessage: {
            async value(m) {
                if (!m) return;

                const arr = Array.isArray(m) ? m : [m];

                for (const message of arr) {
                    if (!message) continue;

                    try {
                        if (
                            message.messageStubType &&
                            message.messageStubType !== WAMessageStubType.CIPHERTEXT
                        ) {
                            conn.processMessageStubType(message).catch((e) => {
                                conn.logger.error(e);
                            });
                        }

                        const msgObj = message.message || {};
                        const mtypeKeys = Object.keys(msgObj);

                        if (!mtypeKeys.length) continue;

                        let mtype = mtypeKeys[0];

                        if (
                            mtype === "senderKeyDistributionMessage" ||
                            mtype === "messageContextInfo"
                        ) {
                            mtype =
                                (mtypeKeys[1] &&
                                    mtypeKeys[1] !== "messageContextInfo" &&
                                    mtypeKeys[1]) ||
                                mtypeKeys[mtypeKeys.length - 1];
                        }

                        const chat = conn.decodeJid(
                            message.key?.remoteJid ||
                                msgObj?.senderKeyDistributionMessage?.groupId ||
                                ""
                        );

                        if (!chat || _isStatusJid(chat)) continue;

                        const isGroup = _isGroupJid(chat);
                        let chats = conn.chats[chat];

                        if (!chats) {
                            if (isGroup) {
                                conn.insertAllGroup?.().catch((e) => {
                                    conn.logger.error(e);
                                });
                            }
                            chats = conn.chats[chat] = {
                                id: chat,
                                isChats: true,
                                ...(conn.chats[chat] || {}),
                            };
                        }

                        const ctx = msgObj[mtype]?.contextInfo;

                        if (ctx?.quotedMessage) {
                            const qMsg = ctx.quotedMessage;
                            const qChat = conn.decodeJid(ctx.remoteJid || ctx.participant || chat);

                            if (qChat && !_isStatusJid(qChat)) {
                                const quotedClone = {
                                    key: {
                                        remoteJid: qChat,
                                        fromMe:
                                            conn.user?.jid && areJidsSameUser
                                                ? areJidsSameUser(conn.user.jid, qChat)
                                                : false,
                                        id: ctx.stanzaId,
                                        participant: conn.decodeJid(ctx.participant),
                                    },
                                    message: qMsg,
                                    ...(qChat.endsWith("@g.us")
                                        ? {
                                              participant: conn.decodeJid(ctx.participant),
                                          }
                                        : {}),
                                };

                                const qm = (conn.chats[qChat] ||= {
                                    id: qChat,
                                    isChats: !_isGroupJid(qChat),
                                });
                                qm.messages ||= Object.create(null);

                                if (!qm.messages[ctx.stanzaId]) {
                                    qm.messages[ctx.stanzaId] = quotedClone;
                                    conn._msgIndex.set(ctx.stanzaId, quotedClone);
                                }

                                _capMap(qm.messages, 40, 30);
                            }
                        }

                        let sender;

                        if (isGroup) {
                            if (!chats.subject || !chats.metadata) {
                                conn.groupMetadata(chat)
                                    .then((md) => {
                                        if (md) {
                                            chats.subject ||= md.subject || "";
                                            chats.metadata = md;
                                        }
                                    })
                                    .catch((e) => {
                                        conn.logger.error(e);
                                    });
                            }

                            sender = conn.decodeJid(
                                (message.key?.fromMe && conn.user?.lid) ||
                                    message.participant ||
                                    message.key?.participant ||
                                    chat
                            );

                            if (sender && sender !== chat) {
                                const sChat = (conn.chats[sender] ||= { id: sender });
                                sChat.name ||= message.pushName || sChat.name || "";
                            }
                        } else {
                            sender = message.key?.fromMe && conn.user?.lid ? conn.user.lid : chat;

                            if (!chats.name) {
                                chats.name = message.pushName || chats.name || "";
                            }
                        }

                        if (
                            mtype === "senderKeyDistributionMessage" ||
                            mtype === "messageContextInfo"
                        ) {
                            continue;
                        }

                        chats.isChats = true;
                        chats.messages ||= Object.create(null);

                        const fromMe =
                            message.key?.fromMe ||
                            (conn.user?.lid && sender && areJidsSameUser
                                ? areJidsSameUser(sender, conn.user.lid)
                                : false);

                        if (
                            mtype !== "protocolMessage" &&
                            !fromMe &&
                            message.message &&
                            message.messageStubType !== WAMessageStubType.CIPHERTEXT &&
                            message.key?.id
                        ) {
                            delete msgObj.messageContextInfo;
                            delete msgObj.senderKeyDistributionMessage;

                            chats.messages[message.key.id] = message;
                            conn._msgIndex.set(message.key.id, message);

                            _capMap(chats.messages, 40, 30);
                        }

                        _cleanupMsgIndex(conn._msgIndex);
                    } catch (e) {
                        conn.logger.error(e);
                    }
                }
            },
            enumerable: true,
        },
        serializeM: {
            value(m) {
                return smsg(conn, m);
            },
        },
    });

    if (conn.user?.lid) {
        conn.user.jid = conn.decodeJid(conn.user.lid);
    }

    store.bind(conn);
    return conn;
}
