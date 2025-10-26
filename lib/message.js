import { fileTypeFromBuffer } from "file-type";
import {
    proto,
    areJidsSameUser,
    extractMessageContent,
    jidDecode,
} from "baileys";

export function smsg(conn, m) {
    if (!m) return m;
    const M = proto.WebMessageInfo;
    if (M?.create && typeof M.create === "function") {
        try {
            m = M.create(m);
        } catch (e) {
            conn.logger.error(e);
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
            const botId = conn.decodeJid?.(conn.user?.id || "") || "";
            const partId = conn.decodeJid?.(key.participant) || "";
            key.fromMe = partId === botId;
            if (!key.fromMe && key.remoteJid === botId) {
                key.remoteJid = m.sender;
            }
            if (m.mtype === "protocolMessage") {
                conn.ev?.emit("message.delete", key);
            }
        }
        if (m.quoted && !m.quoted.mediaMessage) {
            delete m.quoted.download;
        }

        if (!m.mediaMessage) {
            delete m.download;
        }
    } catch (e) {
        conn.logger?.error(e);
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
    const ensureCache = (ctx) => {
        if (!ctx[SYM_CACHE]) {
            ctx[SYM_CACHE] = Object.create(null);
        }
        return ctx[SYM_CACHE];
    };
    const memo = (ctx, key, compute) => {
        const c = ensureCache(ctx);
        if (Object.prototype.hasOwnProperty.call(c, key)) return c[key];
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
            enumerable: true,
        },
        isBaileys: {
            get() {
                const id = this.id;
                return !!(
                    id &&
                    (id.length === 16 || (id.startsWith?.("3EB0") && id.length === 12))
                );
            },
            enumerable: true,
        },
        chat: {
            get() {
                return memo(this, "chat", () => {
                    const skdm = this.message?.senderKeyDistributionMessage?.groupId;
                    const raw = this.key?.remoteJid || (skdm && skdm !== "status@broadcast") || "";
                    return raw.decodeJid?.() ?? raw;
                });
            },
            enumerable: true,
        },
        isChannel: {
            get() {
                return this.chat?.endsWith?.("@newsletter") || false;
            },
            enumerable: true,
        },
        isGroup: {
            get() {
                return this.chat?.endsWith?.("@g.us") || false;
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
            enumerable: true,
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
            enumerable: true,
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
                    if (!type) return null;
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
                                return areJidsSameUser?.(this.sender, self.conn?.user?.jid) || false;
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
                                return s ? self.conn?.getName?.(s) || null : null;
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
                            enumerable: true,
                        },
                        fakeObj: {
                            get() {
                                return this.vM;
                            },
                            enumerable: true,
                        },
                        download: {
                            value() {
                                const t = this.mediaType;
                                if (!t || !self.conn?.downloadM) {
                                    return Promise.resolve(Buffer.alloc(0));
                                }
                                return self.conn.downloadM(
                                    this.mediaMessage[t],
                                    t.replace(/message/i, "")
                                ).catch(() => Buffer.alloc(0));
                            },
                            enumerable: true,
                            configurable: true,
                        },
                        reply: {
                            value(text, chatId, options = {}) {
                                if (!self.conn?.reply) {
                                    return Promise.reject(new Error("Connection not available"));
                                }
                                return self.conn.reply(
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
                            value(jid, force = false, options = {}) {
                                if (!self.conn?.sendMessage) {
                                    return Promise.reject(new Error("Connection not available"));
                                }
                                return self.conn.sendMessage(
                                    jid,
                                    { forward: this.vM, force, ...options },
                                    { ...options }
                                );
                            },
                            enumerable: true,
                        },
                        delete: {
                            value() {
                                if (!self.conn?.sendMessage) {
                                    return Promise.reject(new Error("Connection not available"));
                                }
                                return self.conn.sendMessage(this.chat, { delete: this.vM.key });
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
            enumerable: false,
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
                return this.conn?.getName?.(this.sender) || "";
            },
            enumerable: true,
        },
        download: {
            value() {
                const t = this.mediaType;
                if (!t || !this.conn?.downloadM) {
                    return Promise.resolve(Buffer.alloc(0));
                }
                return this.conn.downloadM(
                    this.mediaMessage[t],
                    t.replace(/message/i, "")
                ).catch(() => Buffer.alloc(0));
            },
            enumerable: true,
            configurable: true,
        },
        reply: {
            value(text, chatId, options = {}) {
                if (!this.conn?.reply) {
                    return Promise.reject(new Error("Connection not available"));
                }
                return this.conn.reply(chatId || this.chat, text, this, options);
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
                if (!this.conn?.sendMessage) {
                    return Promise.reject(new Error("Connection not available"));
                }
                return this.conn.sendMessage(
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
                if (!q?.id || !this.conn) return null;
                const M = this.conn.loadMessage?.(q.id) || q.vM;
                if (!M) return null;
                try {
                    const vm = proto.WebMessageInfo.fromObject(M);
                    return smsg(this.conn, vm);
                } catch (error) {
                    console.debug("Failed to get quoted object:", error);
                    return null;
                }
            },
            enumerable: true,
        },
        getQuotedMessage: {
            get() {
                return this.getQuotedObj;
            },
            enumerable: true,
        },
        delete: {
            value() {
                if (!this.conn?.sendMessage) {
                    return Promise.reject(new Error("Connection not available"));
                }
                return this.conn.sendMessage(this.chat, { delete: this.key });
            },
            enumerable: true,
        },
    });
}

export function protoType() {
    // Check if already defined to prevent re-definition
    if (!Buffer.prototype.toArrayBuffer) {
        Buffer.prototype.toArrayBuffer = function toArrayBuffer() {
            return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength);
        };
    }

    if (!ArrayBuffer.prototype.toBuffer) {
        ArrayBuffer.prototype.toBuffer = function toBuffer() {
            return Buffer.from(this);
        };
    }

    const getFileTypeUnified = async function () {
        try {
            const buf = Buffer.isBuffer(this)
                ? this
                : this instanceof ArrayBuffer
                  ? Buffer.from(this)
                  : this instanceof Uint8Array
                    ? Buffer.from(this.buffer, this.byteOffset, this.byteLength)
                    : Buffer.from(this.buffer || this);
            return await fileTypeFromBuffer(buf);
        } catch (error) {
            console.debug("Failed to determine file type:", error);
            return { ext: "bin", mime: "application/octet-stream" };
        }
    };

    if (!Buffer.prototype.getFileType) {
        Buffer.prototype.getFileType = getFileTypeUnified;
    }
    if (!Uint8Array.prototype.getFileType) {
        Uint8Array.prototype.getFileType = getFileTypeUnified;
    }
    if (!ArrayBuffer.prototype.getFileType) {
        ArrayBuffer.prototype.getFileType = getFileTypeUnified;
    }

    if (!String.prototype.isNumber) {
        String.prototype.isNumber = function isNumber() {
            const str = String(this);
            const n = parseFloat(str);
            return !isNaN(n) && isFinite(n);
        };
    }

    if (!Number.prototype.isNumber) {
        Number.prototype.isNumber = function isNumber() {
            return !isNaN(this) && isFinite(this);
        };
    }

    if (!String.prototype.capitalize) {
        String.prototype.capitalize = function capitalize() {
            const str = String(this);
            return str.length ? str[0].toUpperCase() + str.slice(1) : "";
        };
    }

    if (!String.prototype.capitalizeV2) {
        String.prototype.capitalizeV2 = function capitalizeV2() {
            const str = String(this);
            return str
                .split(" ")
                .map((w) => w.capitalize())
                .join(" ");
        };
    }

    if (!String.prototype.decodeJid) {
        String.prototype.decodeJid = function decodeJid() {
            const str = String(this);
            if (str.includes(":")) {
                try {
                    const decode = jidDecode(str);
                    if (decode?.user && decode?.server) {
                        return `${decode.user}@${decode.server}`.trim();
                    }
                } catch (error) {
                    console.debug("Failed to decode JID:", error);
                }
            }
            return str.trim();
        };
    }

    if (!Number.prototype.toTimeString) {
        Number.prototype.toTimeString = function toTimeString() {
            const totalSec = Math.floor(Number(this) / 1000);
            if (totalSec < 0 || !isFinite(totalSec)) return "0s";
            const d = Math.floor(totalSec / 86400);
            const h = Math.floor((totalSec % 86400) / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            return `${d ? d + "d " : ""}${h ? h + "h " : ""}${m ? m + "m " : ""}${s ? s + "s" : ""}`.trim() || "0s";
        };
    }

    const getRandom = function () {
        if (Array.isArray(this) || typeof this === "string") {
            if (!this.length) return null;
            return this[Math.floor(Math.random() * this.length)];
        }
        const num = Number(this);
        if (isNaN(num) || num <= 0) return 0;
        return Math.floor(Math.random() * num);
    };

    if (!Number.prototype.getRandom) {
        Number.prototype.getRandom = getRandom;
    }
    if (!String.prototype.getRandom) {
        String.prototype.getRandom = getRandom;
    }
    if (!Array.prototype.getRandom) {
        Array.prototype.getRandom = getRandom;
    }
}