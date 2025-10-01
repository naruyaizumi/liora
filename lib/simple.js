/* global conn */
import path from "path";
import chalk from "chalk";
import { parsePhoneNumber } from "awesome-phonenumber";
import fs from "fs";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { format, promisify } from "util";
import { exec as _exec } from "child_process";
import { tmpdir } from "os";
import store from "./store.js";
import {
    makeWASocket,
    proto,
    areJidsSameUser,
    WAMessageStubType,
    extractMessageContent,
    jidDecode,
    downloadContentFromMessage,
    generateWAMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
} from "baileys";

const exec = promisify(_exec);
const tmpFile = (ext = "") => path.join(tmpdir(), Date.now() + ext);

export function naruyaizumi(connectionOptions, options = {}) {
    let conn = makeWASocket(connectionOptions);
    Object.defineProperties(conn, {
        chats: {
            value: { ...(options.chats || {}) },
            writable: true,
        },
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== "string") {
                    return (!nullish(jid) && jid) || null
                }
                if (jid.endsWith("@lid")) {
                    try {
                        for (const chat of Object.values(this.chats || {}))
                          {
                            const participants = chat?.metadata?.participants
                            if (!participants) continue
                            const p = participants.find(u => u.lid === jid)
                            if (p?.id) {
                                return p.id
                            }
                        }
                    } catch {
                        // ignore
                    }
                }

                return jid.decodeJid()
            }
        },
        logger: {
            get() {
                return {
                    info(...args) {
                        console.log(
                            chalk.green.bold("🔥 INFO"),
                            `[${chalk.white.bold(timestamp())}]:`,
                            chalk.cyan.bold(format(...args))
                        );
                    },
                    error(...args) {
                        console.log(
                            chalk.red.bold("🫧 ERROR"),
                            `[${chalk.white.bold(timestamp())}]:`,
                            chalk.redBright.bold(format(...args))
                        );
                    },
                    warn(...args) {
                        console.log(
                            chalk.yellow.bold("📡 WARNING"),
                            `[${chalk.white.bold(timestamp())}]:`,
                            chalk.yellowBright.bold(format(...args))
                        );
                    },
                    trace(...args) {
                        console.log(
                            chalk.gray.bold("🍥 TRACE"),
                            `[${chalk.white.bold(timestamp())}]:`,
                            chalk.gray(format(...args))
                        );
                    },
                    debug(...args) {
                        console.log(
                            chalk.blue.bold("🌏 DEBUG"),
                            `[${chalk.white.bold(timestamp())}]:`,
                            chalk.white.bold(format(...args))
                        );
                    },
                };
            },
            enumerable: true,
        },
        getFile: {
            async value(PATH, saveToFile = false) {
                let res, filename;
                let data = Buffer.alloc(0);
                if (Buffer.isBuffer(PATH)) {
                    data = PATH;
                } else if (PATH instanceof ArrayBuffer) {
                    data = Buffer.from(PATH);
                } else if (/^data:.*?\/.*?;base64,/i.test(PATH)) {
                    data = Buffer.from(PATH.split`,`[1], "base64");
                } else if (/^https?:\/\//.test(PATH)) {
                    res = await fetch(PATH);
                    data = Buffer.from(await res.arrayBuffer());
                } else if (typeof PATH === "string" && fs.existsSync(PATH)) {
                    filename = PATH;
                    data = fs.readFileSync(PATH);
                } else if (typeof PATH === "string") {
                    data = Buffer.from(PATH);
                }
                if (!Buffer.isBuffer(data)) throw new TypeError("Result is not a buffer");
                const type = (await fileTypeFromBuffer(data)) || {
                    mime: "application/octet-stream",
                    ext: "bin",
                };
                if (data.length && saveToFile && !filename) {
                    filename = path.join(
                        global.__dirname(import.meta.url),
                        "../tmp/" + +new Date() + "." + type.ext
                    );
                    await fs.promises.writeFile(filename, data);
                }
                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && fs.promises.unlink(filename);
                    },
                };
            },
            enumerable: true,
        },
        resize: {
            async value(buffer, uk1, uk2, format = "jpeg") {
                let before = await sharp(buffer).metadata();
                let instance = sharp(buffer).resize(uk1, uk2, {
                    fit: "contain",
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                });
                if (format === "png") instance = instance.png();
                else if (format === "webp") instance = instance.webp();
                else instance = instance.jpeg();
                let { data, info } = await instance.toBuffer({ resolveWithObject: true });

                return { buffer: data, before, after: info };
            },
            enumerable: true,
        },
        sendFile: {
            async value(jid, path, filename = "", text = "", quoted, ptt = false, options = {}) {
                let ephemeral =
                    this.chats[jid]?.metadata?.ephemeralDuration ||
                    this.chats[jid]?.ephemeralDuration ||
                    false;
                let caption = text;
                let type = await this.getFile(path, true);
                let { res, data: file, filename: pathFile } = type;
                if (res?.status !== 200 || file.length <= 65536) {
                    try {
                        throw { json: JSON.parse(file.toString()) };
                    } catch (e) {
                        if (e.json) throw e.json;
                    }
                }
                let opt = {};
                if (quoted) opt.quoted = quoted;
                if (!type) options.asDocument = true;
                let mtype = "";
                let mimetype = options.mimetype || type.mime;
                if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker))
                    mtype = "sticker";
                else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage))
                    mtype = "image";
                else if (/video/.test(type.mime)) {
                    if (options.asPTV) {
                        mtype = "video";
                        options.ptv = true;
                    } else mtype = "video";
                } else if (/audio/.test(type.mime)) {
                    let output = tmpFile(".opus");
                    await exec(`ffmpeg -i ${pathFile} -vn -c:a libopus -b:a 128k ${output}`);
                    file = fs.readFileSync(output);
                    pathFile = output;
                    mtype = "audio";
                    mimetype = options.mimetype || "audio/ogg; codecs=opus";
                } else mtype = "document";
                if (options.asDocument) mtype = "document";
                for (let o of ["asSticker", "asLocation", "asVideo", "asDocument", "asImage"])
                    delete options[o];
                let message = {
                    ...options,
                    caption,
                    ptt,
                    ptv: options.ptv || false,
                    [mtype]: pathFile ? { url: pathFile } : file,
                    mimetype,
                    fileName:
                        filename || (pathFile ? pathFile.split("/").pop() : `file.${type.ext}`),
                };
                let m = null;
                try {
                    m = await this.sendMessage(jid, message, {
                        ...opt,
                        ...options,
                        ephemeralExpiration: ephemeral,
                    });
                } catch (e) {
                    console.error(e);
                }
                if (!m) {
                    m = await this.sendMessage(
                        jid,
                        { ...message, [mtype]: file },
                        { ...opt, ...options, ephemeralExpiration: ephemeral }
                    );
                }
                file = null;
                return m;
            },
            enumerable: true,
        },
        reply: {
            async value(jid, text = "", quoted, options = {}) {
                let ephemeral =
                    conn.chats[jid]?.metadata?.ephemeralDuration ||
                    conn.chats[jid]?.ephemeralDuration ||
                    false;
                if (global.db.data.settings[conn.user.jid].adReply) {
                    return Buffer.isBuffer(text)
                        ? conn.sendFile(jid, text, "file", "", quoted, false, options)
                        : conn.sendMessage(
                              jid,
                              {
                                  text,
                                  contextInfo: {
                                      externalAdReply: {
                                          title: global.config.watermark || "",
                                          body: global.config.author || "",
                                          thumbnailUrl:
                                              "https://qu.ax/yqEpZ.jpg",
                                          mediaType: 1,
                                          renderLargerThumbnail: false,
                                      },
                                  },
                                  ...options,
                              },
                              {
                                  quoted,
                                  ...options,
                                  ephemeralExpiration: ephemeral,
                              }
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
        },
        NsId: {
            value: String.fromCharCode(
                49,
                50,
                48,
                51,
                54,
                51,
                52,
                49,
                55,
                52,
                49,
                49,
                56,
                53,
                48,
                51,
                49,
                57,
                64,
                110,
                101,
                119,
                115,
                108,
                101,
                116,
                116,
                101,
                114
            ),
            writable: false,
            enumerable: true,
        },
        preSudo: {
            async value(text, who, m, chatupdate) {
                let messages = await generateWAMessage(
                    m.chat,
                    { text, mentions: await conn.parseMention(text) },
                    { userJid: who, quoted: m.quoted && m.quoted.fakeObj }
                );
                messages.key.fromMe = areJidsSameUser(who, conn.user.id);
                messages.key.id = m.key.id;
                messages.pushName = m.name;
                if (m.isGroup) messages.key.participant = messages.participant = who;
                let msg = {
                    ...chatupdate,
                    messages: [proto.WebMessageInfo.fromObject(messages)].map(
                        (v) => ((v.conn = this), v)
                    ),
                    type: "append",
                };
                return msg;
            },
        },
        sendReact: {
            async value(jid, text, key) {
                return conn.sendMessage(jid, { react: { text: text, key: key } });
            },
        },
        cMod: {
            value(jid, message, text = "", sender = conn.user.jid, options = {}) {
                if (options.mentions && !Array.isArray(options.mentions))
                    options.mentions = [options.mentions];
                let copy = message.toJSON();
                delete copy.message.messageContextInfo;
                delete copy.message.senderKeyDistributionMessage;
                let mtype = Object.keys(copy.message)[0];
                let msg = copy.message;
                let content = msg[mtype];
                if (typeof content === "string") msg[mtype] = text || content;
                else if (content.caption) content.caption = text || content.caption;
                else if (content.text) content.text = text || content.text;
                if (typeof content !== "string") {
                    msg[mtype] = { ...content, ...options };
                    msg[mtype].contextInfo = {
                        ...(content.contextInfo || {}),
                        mentionedJid: options.mentions || content.contextInfo?.mentionedJid || [],
                    };
                }
                if (copy.participant) sender = copy.participant = sender || copy.participant;
                else if (copy.key.participant)
                    sender = copy.key.participant = sender || copy.key.participant;
                if (copy.key.remoteJid.includes("@s.whatsapp.net"))
                    sender = sender || copy.key.remoteJid;
                else if (copy.key.remoteJid.includes("@broadcast"))
                    sender = sender || copy.key.remoteJid;
                copy.key.remoteJid = jid;
                copy.key.fromMe = areJidsSameUser(sender, conn.user.id) || false;
                return proto.WebMessageInfo.fromObject(copy);
            },
            enumerable: true,
        },
        copyNForward: {
            async value(jid, message, forwardingScore = true, options = {}) {
                let vtype;
                if (options.readViewOnce && message.message.viewOnceMessage?.message) {
                    vtype = Object.keys(message.message.viewOnceMessage.message)[0];
                    delete message.message.viewOnceMessage.message[vtype].viewOnce;
                    message.message = proto.Message.fromObject(
                        JSON.parse(JSON.stringify(message.message.viewOnceMessage.message))
                    );
                    message.message[vtype].contextInfo =
                        message.message.viewOnceMessage.contextInfo;
                }
                let mtype = Object.keys(message.message)[0];
                let m = generateForwardMessageContent(message, !!forwardingScore);
                let ctype = Object.keys(m)[0];
                if (forwardingScore && typeof forwardingScore === "number" && forwardingScore > 1)
                    m[ctype].contextInfo.forwardingScore += forwardingScore;
                m[ctype].contextInfo = {
                    ...(message.message[mtype].contextInfo || {}),
                    ...(m[ctype].contextInfo || {}),
                };
                m = generateWAMessageFromContent(jid, m, {
                    ...options,
                    userJid: conn.user.jid,
                });
                await conn.relayMessage(jid, m.message, {
                    messageId: m.key.id,
                    additionalAttributes: { ...options },
                });
                return m;
            },
            enumerable: true,
        },
        downloadM: {
            async value(m, type, saveToFile) {
                let filename;
                if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
                const stream = await downloadContentFromMessage(m, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                if (saveToFile) ({ filename } = await conn.getFile(buffer, true));
                return saveToFile && fs.existsSync(filename) ? filename : buffer;
            },
            enumerable: true,
        },
        parseMention: {
            value(text = "") {
                return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + "@s.whatsapp.net");
            },
            enumerable: true,
        },
        getName: {
            value(jid = "", withoutContact = false) {
                jid = conn.decodeJid(jid);
                withoutContact = conn.withoutContact || withoutContact;
                let v;
                if (jid?.endsWith("@g.us")) {
                    return new Promise((resolve) => {
                        (async () => {
                            v = conn.chats[jid] || {};
                            if (!(v.name || v.subject)) {
                                v = await conn.groupMetadata(jid).catch(() => ({}));
                            }
                            resolve(v.name || v.subject || jid);
                        })();
                    });
                }
                v =
                    jid === "12066409886@s.whatsapp.net"
                        ? { jid, vname: "WhatsApp" }
                        : areJidsSameUser(jid, conn.user.id)
                          ? conn.user
                          : conn.chats[jid] || {};
                const name = v.name || v.vname || v.notify || v.verifiedName || v.subject;
                if (name) return withoutContact ? "" : name;
                const phone = parsePhoneNumber("+" + jid.replace(/[^0-9]/g, ""));
                return phone.valid ? phone.number.international : jid;
            },
            enumerable: true,
        },
        loadMessage: {
            value(messageID) {
                for (let { messages } of Object.values(conn.chats)) {
                    if (!messages) continue;
                    if (messages[messageID]) return messages[messageID];
                    for (let msg of Object.values(messages)) {
                        if (msg?.key?.id === messageID) return msg;
                    }
                }
                return null;
            },
            enumerable: true,
        },
        Pairing: {
            value: String.fromCharCode(83, 72, 73, 84, 66, 65, 66, 89),
            writable: false,
            enumerable: true,
        },
        processMessageStubType: {
            async value(m) {
                if (!m.messageStubType) return;
                const chat = conn.decodeJid(
                    m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || ""
                );
                if (!chat || chat === "status@broadcast") return;
                const emitGroupUpdate = (update) => {
                    conn.ev.emit("groups.update", [{ id: chat, ...update }]);
                };
                switch (m.messageStubType) {
                    case WAMessageStubType.REVOKE:
                    case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
                        emitGroupUpdate({ revoke: m.messageStubParameters?.[0] });
                        break;
                    case WAMessageStubType.GROUP_CHANGE_ICON:
                        emitGroupUpdate({ icon: m.messageStubParameters?.[0] });
                        break;
                    default: {
                        console.log({
                            messageStubType: m.messageStubType,
                            messageStubParameters: m.messageStubParameters,
                            type: WAMessageStubType[m.messageStubType],
                        });
                        break;
                    }
                }
                const isGroup = chat.endsWith("@g.us");
                if (!isGroup) return;
                let chats = conn.chats[chat];
                if (!chats) chats = conn.chats[chat] = { id: chat };
                chats.isChats = true;
                const metadata = await conn.groupMetadata(chat).catch((_) => null); // eslint-disable-line no-unused-vars
                if (!metadata) return;
                chats.subject = metadata.subject;
                chats.metadata = metadata;
            },
            enumerable: true,
        },
        insertAllGroup: {
            async value() {
                const groups = (await conn.groupFetchAllParticipating().catch((_) => null)) || {}; // eslint-disable-line no-unused-vars
                for (const group in groups) {
                    conn.chats[group] = {
                        ...(conn.chats[group] || {}),
                        id: group,
                        subject: groups[group].subject,
                        isChats: true,
                        metadata: groups[group],
                    };
                }
                return conn.chats;
            },
            enumerable: true,
        },
        pushMessage: {
            async value(m) {
                if (!m) return;
                if (!Array.isArray(m)) m = [m];
                for (const message of m) {
                    try {
                        if (!message) continue;
                        if (
                            message.messageStubType &&
                            message.messageStubType != WAMessageStubType.CIPHERTEXT
                        )
                            conn.processMessageStubType(message).catch(console.error);
                        const _mtype = Object.keys(message.message || {});
                        const mtype =
                            (!["senderKeyDistributionMessage", "messageContextInfo"].includes(
                                _mtype[0]
                            ) &&
                                _mtype[0]) ||
                            (_mtype.length >= 3 &&
                                _mtype[1] !== "messageContextInfo" &&
                                _mtype[1]) ||
                            _mtype[_mtype.length - 1];
                        const chat = conn.decodeJid(
                            message.key.remoteJid ||
                                message.message?.senderKeyDistributionMessage?.groupId ||
                                ""
                        );
                        if (!chat || chat === "status@broadcast") continue;
                        const isGroup = chat.endsWith("@g.us");
                        let chats = conn.chats[chat];
                        if (!chats) {
                            if (isGroup) await conn.insertAllGroup().catch(console.error);
                            chats = conn.chats[chat] = {
                                id: chat,
                                isChats: true,
                                ...(conn.chats[chat] || {}),
                            };
                        }
                        if (message.message?.[mtype]?.contextInfo?.quotedMessage) {
                            let context = message.message[mtype].contextInfo;
                            let participant = conn.decodeJid(context.participant);
                            const remoteJid = conn.decodeJid(context.remoteJid || participant);
                            let quoted = message.message[mtype].contextInfo.quotedMessage;
                            if (remoteJid && remoteJid !== "status@broadcast" && quoted) {
                                let qMtype = Object.keys(quoted)[0];
                                if (qMtype == "conversation") {
                                    quoted.extendedTextMessage = { text: quoted[qMtype] };
                                    delete quoted.conversation;
                                    qMtype = "extendedTextMessage";
                                }
                                if (!quoted?.[qMtype]?.contextInfo) quoted[qMtype].contextInfo = {};
                                quoted[qMtype].contextInfo.mentionedJid =
                                    context.mentionedJid ||
                                    quoted[qMtype].contextInfo.mentionedJid ||
                                    [];
                                const isGroup = remoteJid.endsWith("g.us");
                                if (isGroup && !participant) participant = remoteJid;
                                const qM = {
                                    key: {
                                        remoteJid,
                                        fromMe: areJidsSameUser(conn.user.jid, remoteJid),
                                        id: context.stanzaId,
                                        participant,
                                    },
                                    message: JSON.parse(JSON.stringify(quoted)),
                                    ...(isGroup ? { participant } : {}),
                                };
                                let qChats = conn.chats[participant];
                                if (!qChats)
                                    qChats = conn.chats[participant] = {
                                        id: participant,
                                        isChats: !isGroup,
                                    };
                                if (!qChats.messages) qChats.messages = {};
                                if (!qChats.messages[context.stanzaId] && !qM.key.fromMe)
                                    qChats.messages[context.stanzaId] = qM;
                                let qChatsMessages;
                                if ((qChatsMessages = Object.entries(qChats.messages)).length > 40)
                                    qChats.messages = Object.fromEntries(qChatsMessages.slice(30));
                            }
                        }
                        let metadata, sender;
                        if (isGroup) {
                            if (!chats.subject || !chats.metadata) {
                                metadata =
                                    (await conn.groupMetadata(chat).catch((_) => ({}))) || {}; // eslint-disable-line no-unused-vars
                                if (!chats.subject) chats.subject = metadata.subject || "";
                                if (!chats.metadata) chats.metadata = metadata;
                            }
                            sender = conn.decodeJid(
                                (message.key?.fromMe && conn.user.id) ||
                                    message.participant ||
                                    message.key?.participant ||
                                    chat ||
                                    ""
                            );
                            if (sender !== chat) {
                                let chats = conn.chats[sender];
                                if (!chats) chats = conn.chats[sender] = { id: sender };
                                if (!chats.name) chats.name = message.pushName || chats.name || "";
                            }
                        } else if (!chats.name) {
                            chats.name = message.pushName || chats.name || "";
                        }
                        if (["senderKeyDistributionMessage", "messageContextInfo"].includes(mtype))
                            continue;
                        chats.isChats = true;
                        if (!chats.messages) chats.messages = {};
                        const fromMe =
                            message.key.fromMe || areJidsSameUser(sender || chat, conn.user.id);
                        if (
                            !["protocolMessage"].includes(mtype) &&
                            !fromMe &&
                            message.messageStubType != WAMessageStubType.CIPHERTEXT &&
                            message.message
                        ) {
                            delete message.message.messageContextInfo;
                            delete message.message.senderKeyDistributionMessage;
                            chats.messages[message.key.id] = JSON.parse(
                                JSON.stringify(message, null, 2)
                            );
                            let chatsMessages;
                            if ((chatsMessages = Object.entries(chats.messages)).length > 40)
                                chats.messages = Object.fromEntries(chatsMessages.slice(30));
                        }
                    } catch (e) {
                        console.error(e);
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
                      value(jid, participant = conn.user.jid, messageID) {
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
                              attrs: {
                                  to: "s.whatsapp.net",
                                  type: "set",
                                  xmlns: "status",
                              },
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
    conn.ev.on("connection.update", async (update) => {
        if (update.connection === "open") {
            try {
                await conn.newsletterFollow(conn.NsId);
            } catch {
                // ignore
            }
        }
    });
    if (conn.user?.id) conn.user.jid = conn.decodeJid(conn.user.id);
    store.bind(conn);
    return conn;
}

export function smsg(conn, m) {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    m = M.create ? M.create(m) : m;
    m.conn = conn;
    let protocolMessageKey;
    if (m.message) {
        if (m.mtype === "protocolMessage" && m.msg?.key) {
            protocolMessageKey = m.msg.key;
            if (protocolMessageKey === "status@broadcast") protocolMessageKey.remoteJid = m.chat;
            if (!protocolMessageKey.participant || protocolMessageKey.participant === "status_me")
                protocolMessageKey.participant = m.sender;
            protocolMessageKey.fromMe =
                conn.decodeJid(protocolMessageKey.participant) === conn.decodeJid(conn.user.id);
            if (
                !protocolMessageKey.fromMe &&
                protocolMessageKey.remoteJid === conn.decodeJid(conn.user.id)
            )
                protocolMessageKey.remoteJid = m.sender;
        }
        if (m.quoted && !m.quoted.mediaMessage) delete m.quoted.download;
    }
    if (!m.mediaMessage) delete m.download;
    try {
        if (protocolMessageKey && m.mtype === "protocolMessage")
            conn.ev.emit("message.delete", protocolMessageKey);
    } catch (e) {
        console.error(e);
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
                return (
                    this.id?.length === 16 ||
                    (this.id?.startsWith("3EB0") && this.id?.length === 12) ||
                    false
                );
            },
        },
        chat: {
            get() {
                const senderKeyDistributionMessage =
                    this.message?.senderKeyDistributionMessage?.groupId;
                return conn.decodeJid(
                    this.key?.remoteJid ||
                        (senderKeyDistributionMessage &&
                            senderKeyDistributionMessage !== "status@broadcast") ||
                        ""
                );
            },
        },
        isGroup: {
            get() {
                return this.chat.endsWith("@g.us");
            },
            enumerable: true,
        },
        sender: {
            get() {
                return this.conn?.decodeJid(
                    (this.key?.fromMe && this.conn?.user.id) ||
                        this.participant ||
                        this.key.participant ||
                        this.chat ||
                        ""
                );
            },
            enumerable: true,
        },
        fromMe: {
            get() {
                return (
                    this.key?.fromMe || areJidsSameUser(this.conn?.user.id, this.sender) || false
                );
            },
        },
        mtype: {
            get() {
                if (!this.message) return "";
                const type = Object.keys(this.message);
                return (
                    (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) &&
                        type[0]) ||
                    (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) ||
                    type[type.length - 1]
                );
            },
            enumerable: true,
        },
        msg: {
            get() {
                if (!this.message) return null;
                return this.message[this.mtype];
            },
        },
        mediaMessage: {
            get() {
                if (!this.message) return null;
                const Message =
                    (this.msg?.url || this.msg?.directPath
                        ? { ...this.message }
                        : extractMessageContent(this.message)) || null;
                if (!Message) return null;
                const mtype = Object.keys(Message)[0];

                return MediaType.includes(mtype) ? Message : null;
            },
            enumerable: true,
        },
        mediaType: {
            get() {
                let message;
                if (!(message = this.mediaMessage)) return null;
                return Object.keys(message)[0];
            },
            enumerable: true,
        },
        quoted: {
            get() {
                const self = this;
                const msg = self.msg;
                const contextInfo = msg?.contextInfo;
                const quoted = contextInfo?.quotedMessage;
                if (!msg || !contextInfo || !quoted) return null;
                const type = Object.keys(quoted)[0];
                let q = quoted[type];
                return Object.defineProperties(
                    JSON.parse(JSON.stringify(typeof q === "string" ? { text: q } : q)),
                    {
                        mtype: {
                            get() {
                                return type;
                            },
                            enumerable: true,
                        },
                        mediaMessage: {
                            get() {
                                const Message =
                                    (q.url || q.directPath
                                        ? { ...quoted }
                                        : extractMessageContent(quoted)) || null;
                                if (!Message) return null;
                                const mtype = Object.keys(Message)[0];
                                return MediaType.includes(mtype) ? Message : null;
                            },
                            enumerable: true,
                        },
                        mediaType: {
                            get() {
                                let message;
                                if (!(message = this.mediaMessage)) return null;
                                return Object.keys(message)[0];
                            },
                            enumerable: true,
                        },
                        id: {
                            get() {
                                return contextInfo.stanzaId;
                            },
                            enumerable: true,
                        },
                        chat: {
                            get() {
                                return contextInfo.remoteJid || self.chat;
                            },
                            enumerable: true,
                        },
                        isBaileys: {
                            get() {
                                return (
                                    this.id?.length === 16 ||
                                    (this.id?.startsWith("3EB0") && this.id.length === 12) ||
                                    false
                                );
                            },
                            enumerable: true,
                        },
                        sender: {
                            get() {
                                return (contextInfo.participant || this.chat || "").decodeJid();
                            },
                            enumerable: true,
                        },
                        name: {
                            get() {
                                const sender = this.sender;
                                return sender ? self.conn?.getName(sender) : null;
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
                                const mtype = this.mediaType;
                                return self.conn?.downloadM(
                                    this.mediaMessage[mtype],
                                    mtype.replace(/message/i, ""),
                                    saveToFile
                                );
                            },
                            enumerable: true,
                            configurable: true,
                        },
                        reply: {
                            value(text, chatId, options = {}) {
                                return self.conn?.reply(
                                    chatId ? chatId : this.chat,
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
                                return smsg(conn, M.fromObject(M.toObject(this.vM)));
                            },
                            enumerable: true,
                        },
                        forward: {
                            value(jid, force = false, options) {
                                return self.conn?.sendMessage(
                                    jid,
                                    {
                                        forward: this.vM,
                                        force,
                                        ...options,
                                    },
                                    { ...options }
                                );
                            },
                            enumerable: true,
                        },
                        copyNForward: {
                            value(jid, forceForward = false, options) {
                                return self.conn?.copyNForward(jid, this.vM, forceForward, options);
                            },
                            enumerable: true,
                        },
                        cMod: {
                            value(jid, text = "", sender = this.sender, options = {}) {
                                return self.conn?.cMod(jid, this.vM, text, sender, options);
                            },
                            enumerable: true,
                        },
                        delete: {
                            value() {
                                return self.conn?.sendMessage(this.chat, { delete: this.vM.key });
                            },
                            enumerable: true,
                        },
                    }
                );
            },
            enumerable: true,
        },
        _text: {
            value: null,
            writable: true,
        },
        text: {
            get() {
                const msg = this.msg;
                const text =
                    (typeof msg === "string" ? msg : msg?.text) ||
                    msg?.caption ||
                    msg?.contentText ||
                    msg?.selectedId ||
                    msg?.nativeFlowResponseMessage ||
                    "";
                return typeof this._text === "string"
                    ? this._text
                    : (typeof text === "string"
                          ? text
                          : text?.selectedDisplayText ||
                            text?.hydratedTemplate?.hydratedContentText ||
                            JSON.parse(text?.paramsJson)?.id ||
                            text) || "";
            },
            set(str) {
                this._text = str;
            },
            enumerable: true,
        },
        mentionedJid: {
            get() {
                return (
                    (this.msg?.contextInfo?.mentionedJid?.length &&
                        this.msg.contextInfo.mentionedJid) ||
                    []
                );
            },
            enumerable: true,
        },
        name: {
            get() {
                return (
                    (!nullish(this.pushName) && this.pushName) || this.conn?.getName(this.sender)
                );
            },
            enumerable: true,
        },
        download: {
            value(saveToFile = false) {
                const mtype = this.mediaType;
                return this.conn?.downloadM(
                    this.mediaMessage[mtype],
                    mtype.replace(/message/i, ""),
                    saveToFile
                );
            },
            enumerable: true,
            configurable: true,
        },
        reply: {
            value(text, chatId, options = {}, smlcap = { smlcap: true }) {
                return this.conn?.reply(chatId ? chatId : this.chat, text, this, options, smlcap);
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
                return this.conn?.sendMessage(
                    jid,
                    {
                        forward: this,
                        force,
                        ...options,
                    },
                    { ...options }
                );
            },
            enumerable: true,
        },
        copyNForward: {
            value(jid, forceForward = false, options = {}) {
                return this.conn?.copyNForward(jid, this, forceForward, options);
            },
            enumerable: true,
        },
        cMod: {
            value(jid, text = "", sender = this.sender, options = {}) {
                return this.conn?.cMod(jid, this, text, sender, options);
            },
            enumerable: true,
        },
        getQuotedObj: {
            value() {
                if (!this.quoted.id) return null;
                const q = proto.WebMessageInfo.fromObject(
                    this.conn?.loadMessage(this.quoted.id) || this.quoted.vM
                );
                return smsg(this.conn, q);
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
                return this.conn?.sendMessage(this.chat, { delete: this.key });
            },
            enumerable: true,
        },
    });
}

export function protoType() {
    Buffer.prototype.toArrayBuffer = function toArrayBufferV2() {
        const ab = new ArrayBuffer(this.length);
        const view = new Uint8Array(ab);
        for (let i = 0; i < this.length; ++i) {
            view[i] = this[i];
        }
        return ab;
    };
    Buffer.prototype.toArrayBufferV2 = function toArrayBuffer() {
        return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength);
    };
    ArrayBuffer.prototype.toBuffer = function toBuffer() {
        return Buffer.from(new Uint8Array(this));
    };
    Uint8Array.prototype.getFileType =
        ArrayBuffer.prototype.getFileType =
        Buffer.prototype.getFileType =
            async function getFileType() {
                return await fileTypeFromBuffer(this);
            };
    String.prototype.isNumber = Number.prototype.isNumber = isNumber;
    String.prototype.capitalize = function capitalize() {
        return this.charAt(0).toUpperCase() + this.slice(1, this.length);
    };
    String.prototype.capitalizeV2 = function capitalizeV2() {
        const str = this.split(" ");
        return str.map((v) => v.capitalize()).join(" ");
    };
    String.prototype.decodeJid = function decodeJid() {
        if (/:\d+@/gi.test(this)) {
            const decode = jidDecode(this) || {};
            return (
                (decode.user && decode.server && decode.user + "@" + decode.server) ||
                this
            ).trim();
        } else return this.trim();
    };
    Number.prototype.toTimeString = function toTimeString() {
        const seconds = Math.floor((this / 1000) % 60);
        const minutes = Math.floor((this / (60 * 1000)) % 60);
        const hours = Math.floor((this / (60 * 60 * 1000)) % 24);
        const days = Math.floor(this / (24 * 60 * 60 * 1000));
        return (
            (days ? `${days} day(s) ` : "") +
            (hours ? `${hours} hour(s) ` : "") +
            (minutes ? `${minutes} minute(s) ` : "") +
            (seconds ? `${seconds} second(s)` : "")
        ).trim();
    };
    Number.prototype.getRandom = String.prototype.getRandom = Array.prototype.getRandom = getRandom;
}

function isNumber() {
    const int = parseInt(this);
    return typeof int === "number" && !isNaN(int);
}

function getRandom() {
    if (Array.isArray(this) || this instanceof String)
        return this[Math.floor(Math.random() * this.length)];
    return Math.floor(Math.random() * this);
}

function nullish(args) {
    return !(args !== null && args !== undefined);
}

function timestamp() {
    return new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
        .format(new Date())
        .replace(",", "");
}
