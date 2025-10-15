/* global conn */ // eslint-disable-line no-unused-vars
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import chalk from "chalk";
import path from "path";
import { access, readFile, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { fileTypeFromBuffer } from "file-type";
import store from "./store.js";
import { convert, fetch } from "liora-lib";
import { Readable } from "stream";
import {
    makeWASocket,
    proto,
    areJidsSameUser,
    WAMessageStubType,
    extractMessageContent,
    jidDecode,
    downloadContentFromMessage,
} from "baileys";

const _MENTION_RE = /@([0-9]{5,16}|0)/g;
const _isStr = (v) => typeof v === "string";
const _isBuf = (v) => Buffer.isBuffer(v);
const _no = () => {};
const _now = () => Date.now();
const _isStatusJid = (id) => !id || id === "status@broadcast";
const _isGroupJid = (id = "") => id.endsWith("@g.us");
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
const _decode = (raw) => {
    if (!raw || typeof raw !== "string") return raw || null;
    const hit = _decodeCache.get(raw);
    if (hit) return hit;
    const norm = raw.decodeJid ? raw.decodeJid() : raw;
    _decodeCache.set(raw, norm);
    return norm;
};
const _ts = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
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
                const ts = _ts();
                const log = (label, color, args) => {
                    const hasChalk = typeof chalk !== "undefined";
                    const tag = hasChalk ? (chalk[color]?.bold(label) ?? label) : label;
                    const time = hasChalk ? chalk.white.bold(ts) : ts;
                    console.log(tag, `[${time}]:`, ...args);
                };
                return {
                    info: (...a) => log("INFO", "green", a),
                    error: (...a) => log("ERROR", "red", a),
                    warn: (...a) => log("WARNING", "yellow", a),
                    trace: (...a) => log("TRACE", "gray", a),
                    debug: (...a) => log("DEBUG", "blue", a),
                };
            },
            enumerable: true,
        },
        getFile: {
            async value(PATH, saveToFile = false) {
                let res, filename;
                let data = Buffer.alloc(0);
                if (_isBuf(PATH)) {
                    data = PATH;
                } else if (PATH instanceof ArrayBuffer) {
                    data = Buffer.from(PATH);
                } else if (_isStr(PATH) && /^data:.*?\/.*?;base64,/i.test(PATH)) {
                    data = Buffer.from(PATH.split(",")[1], "base64");
                } else if (_isStr(PATH) && /^https?:\/\//.test(PATH)) {
                    res = await fetch(PATH);
                    data = Buffer.from(await res.arrayBuffer());
                } else if (_isStr(PATH) && existsSync(PATH)) {
                    filename = PATH;
                    data = await readFile(PATH);
                } else if (_isStr(PATH)) {
                    data = Buffer.from(PATH);
                }
                if (!_isBuf(data)) throw new TypeError("Result is not a buffer");
                const type = (await fileTypeFromBuffer(data).catch(_no)) || {
                    mime: "application/octet-stream",
                    ext: "bin",
                };
                if (data.length && saveToFile && !filename) {
                    filename = path.join(
                        global.__dirname?.(import.meta.url) || process.cwd(),
                        "../tmp/" + _now() + "." + type.ext
                    );
                    await writeFile(filename, data);
                }
                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && unlink(filename);
                    },
                };
            },
            enumerable: true,
        },
        sendAlbum: {
            async value(jid, items = [], options = {}) {
                const messageContent = {
                    messageContextInfo: { messageSecret: randomBytes(32) },
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
                const album = generateWAMessageFromContent(jid, messageContent, generationOptions);
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
            },
            enumerable: true,
        },
        sendFile: {
            async value(jid, path, filename = "", text = "", quoted, ptt = false, options = {}) {
                const ephemeral =
                    this.chats[jid]?.metadata?.ephemeralDuration ||
                    this.chats[jid]?.ephemeralDuration ||
                    false;
                const caption = text;
                const type = await this.getFile(path, false);
                let { res, data: file, filename: pathFile } = type;
                if (res?.status && res.status !== 200) {
                    let err;
                    try {
                        err = JSON.parse(file.toString());
                    } catch {
                        err = { status: res.status };
                    }
                    throw err;
                }
                const opt =
                    quoted && typeof quoted === "object" && quoted.key
                        ? {
                              quoted: {
                                  ...quoted,
                                  key: { ...quoted.key, fromMe: !!quoted.key.fromMe },
                              },
                          }
                        : {};
                if (!type) options.asDocument = true;
                let mtype = "";
                let mimetype = options.mimetype || type.mime;
                if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) {
                    mtype = "sticker";
                } else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) {
                    mtype = "image";
                } else if (/video/.test(type.mime)) {
                    mtype = "video";
                    if (options.asPTV) options.ptv = true;
                } else if (/audio/.test(type.mime)) {
                    const buffer = _isBuf(file) ? file : Buffer.from(file);
                    let converted;
                    try {
                        converted = convert(buffer, {
                            format: "opus",
                            bitrate: "128k",
                            channels: 1,
                            sampleRate: 48000,
                            ptt: !!ptt,
                        });
                    } catch {
                        converted = buffer;
                    }
                    const finalBuffer =
                        converted instanceof Buffer
                            ? converted
                            : converted?.buffer
                              ? Buffer.from(converted.buffer)
                              : converted?.data
                                ? Buffer.from(converted.data)
                                : Buffer.from(converted);
                    file =
                        finalBuffer.length > 5 * 1024 * 1024
                            ? Readable.from(finalBuffer)
                            : finalBuffer;
                    pathFile = null;
                    mtype = "audio";
                    mimetype = options.mimetype || "audio/ogg; codecs=opus";
                } else {
                    mtype = "document";
                }
                if (options.asDocument) mtype = "document";
                for (const o of ["asSticker", "asLocation", "asVideo", "asDocument", "asImage"])
                    delete options[o];
                const message = {
                    ...options,
                    caption,
                    ptt,
                    ptv: options.ptv || false,
                    [mtype]: pathFile ? { url: pathFile } : file,
                    mimetype,
                    fileName:
                        filename || (pathFile ? pathFile.split("/").pop() : `file.${type.ext}`),
                };
                try {
                    return await this.sendMessage(jid, message, {
                        ...opt,
                        ...options,
                        ephemeralExpiration: ephemeral,
                    });
                } catch {
                    return this.sendMessage(
                        jid,
                        { ...message, [mtype]: file },
                        { ...opt, ...options, ephemeralExpiration: ephemeral }
                    );
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
                const thumb = thumbs[(Math.random() * thumbs.length) | 0];

                if (_isStr(text) && text.trim()) {
                    text = text.startsWith("```") ? text : `\`\`\`\n${text}\n\`\`\``;
                }
                if (global.db?.data?.settings?.[conn.user.jid]?.adReply) {
                    return Buffer.isBuffer(text)
                        ? conn.sendFile(jid, text, "file", "", quoted, false, options)
                        : conn.sendMessage(
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
                              { quoted, ...options, ephemeralExpiration: ephemeral }
                          );
                } else {
                    return Buffer.isBuffer(text)
                        ? conn.sendFile(jid, text, "file", "", quoted, false, options)
                        : conn.sendMessage(
                              jid,
                              { text, ...options },
                              { quoted, ...options, ephemeralExpiration: ephemeral }
                          );
                }
            },
            enumerable: true,
        },
        downloadM: {
            async value(m, type, saveToFile) {
                if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
                const stream = await downloadContentFromMessage(m, type);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                let buffer = Buffer.concat(chunks);
                if (saveToFile) {
                    const file = await conn.getFile(buffer, true);
                    const filename = file?.filename;
                    try {
                        await access(filename);
                        return filename;
                    } catch {
                        return buffer;
                    }
                }
                return buffer;
            },
            enumerable: true,
        },
        parseMention: {
            value(text = "") {
                const out = [];
                for (const m of text.matchAll(_MENTION_RE)) out.push(m[1] + "@s.whatsapp.net");
                return out;
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
                    const md = await conn.groupMetadata(jid).catch(_no);
                    return md?.subject || c.name || jid;
                }
                const self = areJidsSameUser?.(jid, conn.user.id);
                const v =
                    jid === "12066409886@s.whatsapp.net"
                        ? { jid, vname: "WhatsApp" }
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

                for (const { messages } of Object.values(conn.chats || {})) {
                    if (!messages) continue;
                    if (messages[messageID]) return messages[messageID];
                    for (const msg of Object.values(messages)) {
                        if (msg?.key?.id === messageID) return msg;
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
                const emitGroupUpdate = (update) =>
                    conn.ev.emit("groups.update", [{ id: chat, ...update }]);
                switch (m.messageStubType) {
                    case WAMessageStubType.REVOKE:
                    case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
                        emitGroupUpdate({ revoke: m.messageStubParameters?.[0] });
                        break;
                    case WAMessageStubType.GROUP_CHANGE_ICON:
                        emitGroupUpdate({ icon: m.messageStubParameters?.[0] });
                        break;
                    default:
                        // Jawa
                        break;
                }
                if (!_isGroupJid(chat)) return;
                const c = (conn.chats[chat] ||= { id: chat, isChats: true });
                const metadata = await conn.groupMetadata(chat).catch(_no);
                if (!metadata) return;
                c.subject = metadata.subject || c.subject || "";
                c.metadata = metadata;
            },
            enumerable: true,
        },
        insertAllGroup: {
            async value() {
                try {
                    const allGroups = (await conn.groupFetchAllParticipating().catch(_no)) || {};
                    if (!allGroups || typeof allGroups !== "object") return conn.chats;
                    const existing = conn.chats || (conn.chats = Object.create(null));
                    const now = _now();
                    for (const [gid, meta] of Object.entries(allGroups)) {
                        if (!_isGroupJid(gid)) continue;
                        const chat = (existing[gid] ||= { id: gid });
                        if (chat.subject !== meta.subject)
                            chat.subject = meta.subject || chat.subject || "";
                        chat.metadata = meta;
                        chat.isChats = true;
                        chat.lastSync = now;
                    }
                    for (const jid in existing) {
                        if (_isGroupJid(jid) && !allGroups[jid]) delete existing[jid];
                    }
                    return existing;
                } catch (e) {
                    conn.logger?.warn?.("[insertAllGroup]", e?.message || e);
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
                            conn.processMessageStubType(message).catch(_no);
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
                            if (isGroup) conn.insertAllGroup?.().catch(_no);
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
                                        fromMe: areJidsSameUser?.(conn.user?.jid, qChat),
                                        id: ctx.stanzaId,
                                        participant: conn.decodeJid(ctx.participant),
                                    },
                                    message: qMsg,
                                    ...(qChat.endsWith("@g.us")
                                        ? { participant: conn.decodeJid(ctx.participant) }
                                        : {}),
                                };
                                const qm = (conn.chats[qChat] ||= { id: qChat, isChats: !isGroup });
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
                                    .catch(_no);
                            }
                            sender = conn.decodeJid(
                                (message.key?.fromMe && conn.user?.id) ||
                                    message.participant ||
                                    message.key?.participant ||
                                    chat
                            );
                            if (sender && sender !== chat) {
                                const sChat = (conn.chats[sender] ||= { id: sender });
                                sChat.name ||= message.pushName || sChat.name || "";
                            }
                        } else if (!chats.name) {
                            chats.name = message.pushName || chats.name || "";
                        }
                        if (
                            mtype === "senderKeyDistributionMessage" ||
                            mtype === "messageContextInfo"
                        )
                            continue;
                        chats.isChats = true;
                        chats.messages ||= Object.create(null);
                        const fromMe =
                            message.key?.fromMe || areJidsSameUser?.(sender || chat, conn.user?.id);
                        if (
                            mtype !== "protocolMessage" &&
                            !fromMe &&
                            message.message &&
                            message.messageStubType !== WAMessageStubType.CIPHERTEXT
                        ) {
                            delete msgObj.messageContextInfo;
                            delete msgObj.senderKeyDistributionMessage;
                            chats.messages[message.key.id] = message;
                            conn._msgIndex.set(message.key.id, message);
                            _capMap(chats.messages, 40, 30);
                        }
                    } catch {
                        // Jawa
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
        ...(typeof conn.chatRead !== "function"
            ? {
                  chatRead: {
                      value(jid, participant = conn.user?.jid, messageID) {
                          return conn.sendReadReceipt(jid, participant, [messageID]);
                      },
                      enumerable: true,
                  },
              }
            : {}),
        ...(typeof conn.setStatus !== "function"
            ? {
                  setStatus: {
                      value(status) {
                          return conn.query({
                              tag: "iq",
                              attrs: { to: "s.whatsapp.net", type: "set", xmlns: "status" },
                              content: [
                                  {
                                      tag: "status",
                                      attrs: {},
                                      content: Buffer.from(status, "utf-8"),
                                  },
                              ],
                          });
                      },
                      enumerable: true,
                  },
              }
            : {}),
    });
    if (conn.user?.id) conn.user.jid = conn.decodeJid(conn.user.id);
    store.bind(conn);
    return conn;
}

export function smsg(conn, m) {
    if (!m) return m;
    const M = proto.WebMessageInfo;
    if (M?.create && typeof M.create === "function") {
        try {
            m = M.create(m);
        } catch {
            // Jawa
        }
    }
    m.conn = conn;
    try {
        const msg = m.message || null;
        if (!msg) return m;
        if (m.mtype === "protocolMessage" && m.msg?.key) {
            const key = (m.msg.key = { ...m.msg.key });
            if (key.remoteJid === "status@broadcast") key.remoteJid = m.chat;
            if (!key.participant || key.participant === "status_me") {
                key.participant = m.sender;
            }
            const botId = conn.decodeJid(conn.user?.id || "");
            const partId = conn.decodeJid(key.participant);
            key.fromMe = partId === botId;
            if (!key.fromMe && key.remoteJid === botId) {
                key.remoteJid = m.sender;
            }
            if (m.mtype === "protocolMessage") {
                conn.ev.emit("message.delete", key);
            }
        }
        if (m.quoted && !m.quoted.mediaMessage) {
            delete m.quoted.download;
        }

        if (!m.mediaMessage) {
            delete m.download;
        }
    } catch (err) {
        console.error("[smsg] error:", err?.message || err);
    }
    return m;
}

export function serialize() {
    const MediaType = [
        "imageMessage",
        "videoMessage",
        "audioMessage",
        "stickerMessage",
        "documentMessage",
    ];
    const SYM_CACHE = Symbol.for("liora.serialize.cache");
    const fastKeys = (o) => (o && typeof o === "object" ? Object.keys(o) : []);
    const safeGet = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
    const firstMeaningfulType = (msg) => {
        const keys = fastKeys(msg);
        if (!keys.length) return "";
        if (!["senderKeyDistributionMessage", "messageContextInfo"].includes(keys[0]))
            return keys[0];
        if (keys.length >= 3 && keys[1] !== "messageContextInfo") return keys[1];
        return keys[keys.length - 1];
    };
    const getMediaEnvelope = (root, node) => {
        if (!node) return null;
        if (node?.url || node?.directPath) return root;
        const extracted = extractMessageContent(root);
        return extracted || null;
    };
    const ensureCache = (ctx) => (ctx[SYM_CACHE] ||= Object.create(null));
    const memo = (ctx, key, compute) => {
        const c = ensureCache(ctx);
        if (key in c) return c[key];
        const v = compute();
        c[key] = v;
        return v;
    };
    return Object.defineProperties(proto.WebMessageInfo.prototype, {
        conn: {
            value: undefined,
            enumerable: false,
            writable: true,
        },
        id: {
            get() {
                return this.key?.id;
            },
        },
        isBaileys: {
            get() {
                const id = this.id;
                return !!(
                    id &&
                    (id.length === 16 || (id.startsWith?.("3EB0") && id.length === 12))
                );
            },
        },
        chat: {
            get() {
                return memo(this, "chat", () => {
                    const skdm = this.message?.senderKeyDistributionMessage?.groupId;
                    const raw = this.key?.remoteJid || (skdm && skdm !== "status@broadcast") || "";
                    return raw.decodeJid?.() ?? raw;
                });
            },
        },
        isChannel: {
            get() {
                return this.chat.endsWith?.("@newsletter") || false;
            },
            enumerable: true,
        },
        isGroup: {
            get() {
                return this.chat.endsWith?.("@g.us") || false;
            },
            enumerable: true,
        },
        sender: {
            get() {
                return memo(this, "sender", () => {
                    const c = this.conn;
                    const myId = c?.user?.id;
                    const cand =
                        (this.key?.fromMe && myId) ||
                        this.participant ||
                        this.key?.participant ||
                        this.chat ||
                        "";
                    return c?.decodeJid ? c.decodeJid(cand) : (cand.decodeJid?.() ?? cand);
                });
            },
            enumerable: true,
        },
        fromMe: {
            get() {
                const me = this.conn?.user?.id;
                return !!(this.key?.fromMe || (me && areJidsSameUser?.(me, this.sender)));
            },
        },
        mtype: {
            get() {
                return memo(this, "mtype", () =>
                    this.message ? firstMeaningfulType(this.message) : ""
                );
            },
            enumerable: true,
        },
        msg: {
            get() {
                return memo(this, "msg", () => (this.message ? this.message[this.mtype] : null));
            },
        },
        mediaMessage: {
            get() {
                return memo(this, "mediaMessage", () => {
                    if (!this.message) return null;
                    const env = getMediaEnvelope(this.message, this.msg);
                    if (!env) return null;
                    const t = fastKeys(env)[0];
                    return MediaType.includes(t) ? env : null;
                });
            },
            enumerable: true,
        },
        mediaType: {
            get() {
                const m = this.mediaMessage;
                return m ? fastKeys(m)[0] : null;
            },
            enumerable: true,
        },
        quoted: {
            get() {
                return memo(this, "quoted", () => {
                    const self = this;
                    const baseMsg = self.msg;
                    const ctx = baseMsg?.contextInfo;
                    const quoted = ctx?.quotedMessage;
                    if (!baseMsg || !ctx || !quoted) return null;
                    const type = fastKeys(quoted)[0];
                    const rawNode = quoted[type];
                    const textNode = typeof rawNode === "string" ? rawNode : rawNode?.text;
                    const base = typeof rawNode === "string" ? { text: rawNode } : rawNode || {};
                    const out = Object.create(base);
                    return Object.defineProperties(out, {
                        mtype: {
                            get() {
                                return type;
                            },
                            enumerable: true,
                        },
                        mediaMessage: {
                            get() {
                                const env = getMediaEnvelope(quoted, rawNode);
                                if (!env) return null;
                                const t = fastKeys(env)[0];
                                return MediaType.includes(t) ? env : null;
                            },
                            enumerable: true,
                        },
                        mediaType: {
                            get() {
                                const m = this.mediaMessage;
                                return m ? fastKeys(m)[0] : null;
                            },
                            enumerable: true,
                        },
                        id: {
                            get() {
                                return ctx.stanzaId;
                            },
                            enumerable: true,
                        },
                        chat: {
                            get() {
                                return ctx.remoteJid || self.chat;
                            },
                            enumerable: true,
                        },
                        isBaileys: {
                            get() {
                                const id = this.id;
                                return !!(
                                    id &&
                                    (id.length === 16 ||
                                        (id.startsWith?.("3EB0") && id.length === 12))
                                );
                            },
                            enumerable: true,
                        },
                        sender: {
                            get() {
                                const raw = ctx.participant || this.chat || "";
                                return raw.decodeJid?.() ?? raw;
                            },
                            enumerable: true,
                        },
                        fromMe: {
                            get() {
                                return areJidsSameUser?.(this.sender, self.conn?.user?.jid);
                            },
                            enumerable: true,
                        },
                        text: {
                            get() {
                                return (
                                    textNode ||
                                    this.caption ||
                                    this.contentText ||
                                    this.selectedDisplayText ||
                                    ""
                                );
                            },
                            enumerable: true,
                        },
                        mentionedJid: {
                            get() {
                                return (
                                    rawNode?.contextInfo?.mentionedJid ||
                                    self.getQuotedObj?.()?.mentionedJid ||
                                    []
                                );
                            },
                            enumerable: true,
                        },
                        name: {
                            get() {
                                const s = this.sender;
                                return s ? self.conn?.getName?.(s) : null;
                            },
                            enumerable: true,
                        },
                        vM: {
                            get() {
                                return proto.WebMessageInfo.fromObject({
                                    key: {
                                        fromMe: this.fromMe,
                                        remoteJid: this.chat,
                                        id: this.id,
                                    },
                                    message: quoted,
                                    ...(self.isGroup ? { participant: this.sender } : {}),
                                });
                            },
                        },
                        fakeObj: {
                            get() {
                                return this.vM;
                            },
                        },
                        download: {
                            value(saveToFile = false) {
                                const t = this.mediaType;
                                if (!t) return Promise.resolve(Buffer.alloc(0));
                                return self.conn?.downloadM?.(
                                    this.mediaMessage[t],
                                    t.replace(/message/i, ""),
                                    saveToFile
                                );
                            },
                            enumerable: true,
                            configurable: true,
                        },
                        reply: {
                            value(text, chatId, options = {}) {
                                return self.conn?.reply?.(
                                    chatId || this.chat,
                                    text,
                                    this.vM,
                                    options
                                );
                            },
                            enumerable: true,
                        },
                        copy: {
                            value() {
                                const M = proto.WebMessageInfo;
                                return smsg(self.conn, M.fromObject(M.toObject(this.vM)));
                            },
                            enumerable: true,
                        },
                        forward: {
                            value(jid, force = false, options) {
                                return self.conn?.sendMessage?.(
                                    jid,
                                    { forward: this.vM, force, ...options },
                                    { ...options }
                                );
                            },
                            enumerable: true,
                        },
                        delete: {
                            value() {
                                return self.conn?.sendMessage?.(this.chat, { delete: this.vM.key });
                            },
                            enumerable: true,
                        },
                    });
                });
            },
            enumerable: true,
        },
        _text: {
            value: null,
            writable: true,
        },
        text: {
            get() {
                const cached = this._text;
                if (typeof cached === "string" && cached.length > 0) return cached;
                const msg = this.msg;
                const primary =
                    (typeof msg === "string" ? msg : msg?.text) ||
                    msg?.caption ||
                    msg?.contentText ||
                    msg?.selectedId ||
                    msg?.nativeFlowResponseMessage ||
                    "";
                if (typeof primary === "string" && primary.length > 0) return primary;
                const alt =
                    primary?.selectedDisplayText ||
                    primary?.hydratedTemplate?.hydratedContentText ||
                    (primary?.paramsJson
                        ? (() => {
                              try {
                                  return JSON.parse(primary.paramsJson)?.id;
                              } catch {
                                  return undefined;
                              }
                          })()
                        : undefined) ||
                    "";

                return alt || "";
            },
            set(str) {
                this._text = str;
            },
            enumerable: true,
        },
        mentionedJid: {
            get() {
                const arr = safeGet(this.msg?.contextInfo || {}, "mentionedJid");
                return Array.isArray(arr) && arr.length ? arr : [];
            },
            enumerable: true,
        },
        name: {
            get() {
                const pn = this.pushName;
                if (pn != null && pn !== "") return pn;
                return this.conn?.getName?.(this.sender);
            },
            enumerable: true,
        },
        download: {
            value(saveToFile = false) {
                const t = this.mediaType;
                if (!t) return Promise.resolve(Buffer.alloc(0));
                return this.conn?.downloadM?.(
                    this.mediaMessage[t],
                    t.replace(/message/i, ""),
                    saveToFile
                );
            },
            enumerable: true,
            configurable: true,
        },
        reply: {
            value(text, chatId, options = {}) {
                return this.conn?.reply?.(chatId || this.chat, text, this, options);
            },
            enumerable: true,
        },
        copy: {
            value() {
                const M = proto.WebMessageInfo;
                return smsg(this.conn, M.fromObject(M.toObject(this)));
            },
            enumerable: true,
        },
        forward: {
            value(jid, force = false, options = {}) {
                return this.conn?.sendMessage?.(
                    jid,
                    { forward: this, force, ...options },
                    { ...options }
                );
            },
            enumerable: true,
        },
        getQuotedObj: {
            value() {
                const q = this.quoted;
                if (!q?.id) return null;
                const M = this.conn?.loadMessage?.(q.id) || q.vM;
                if (!M) return null;
                const vm = proto.WebMessageInfo.fromObject(M);
                return smsg(this.conn, vm);
            },
            enumerable: true,
        },
        getQuotedMessage: {
            get() {
                return this.getQuotedObj;
            },
        },
        delete: {
            value() {
                return this.conn?.sendMessage?.(this.chat, { delete: this.key });
            },
            enumerable: true,
        },
    });
}

export function protoType() {
    Buffer.prototype.toArrayBuffer = function toArrayBuffer() {
        return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength);
    };
    ArrayBuffer.prototype.toBuffer = function toBuffer() {
        return Buffer.from(this);
    };
    const getFileTypeUnified = async function () {
        try {
            const buf = Buffer.isBuffer(this)
                ? this
                : this instanceof ArrayBuffer
                  ? Buffer.from(this)
                  : Buffer.from(this.buffer || this);
            return await fileTypeFromBuffer(buf);
        } catch {
            return { ext: "bin", mime: "application/octet-stream" };
        }
    };
    Buffer.prototype.getFileType =
        Uint8Array.prototype.getFileType =
        ArrayBuffer.prototype.getFileType =
            getFileTypeUnified;
    String.prototype.isNumber = Number.prototype.isNumber = function isNumber() {
        const n = parseFloat(this);
        return !isNaN(n) && isFinite(n);
    };
    String.prototype.capitalize = function capitalize() {
        return this.length ? this[0].toUpperCase() + this.slice(1) : "";
    };
    String.prototype.capitalizeV2 = function capitalizeV2() {
        return this.split(" ")
            .map((w) => w.capitalize())
            .join(" ");
    };
    String.prototype.decodeJid = function decodeJid() {
        if (typeof this !== "string") return this;
        if (this.includes(":")) {
            const decode = jidDecode(this);
            if (decode?.user && decode?.server) return `${decode.user}@${decode.server}`.trim();
        }
        return this.trim();
    };
    Number.prototype.toTimeString = function toTimeString() {
        const totalSec = Math.floor(this / 1000);
        const d = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${d ? d + "d " : ""}${h ? h + "h " : ""}${m ? m + "m " : ""}${s ? s + "s" : ""}`.trim();
    };
    const getRandom = function () {
        if (Array.isArray(this) || typeof this === "string") {
            if (!this.length) return null;
            return this[Math.floor(Math.random() * this.length)];
        }
        return Math.floor(Math.random() * Number(this));
    };

    Number.prototype.getRandom = String.prototype.getRandom = Array.prototype.getRandom = getRandom;
}
