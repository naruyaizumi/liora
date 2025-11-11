import { smsg } from "./smsg.js";
import { proto, areJidsSameUser, extractMessageContent } from "baileys";

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
                return this.key?.id || null;
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
                    const raw =
                        this.key?.remoteJid ||
                        (skdm && skdm !== "status@broadcast" ? skdm : "") ||
                        "";
                    if (typeof raw.decodeJid === "function") {
                        return raw.decodeJid();
                    }
                    return raw;
                });
            },
            enumerable: true,
        },
        isChannel: {
            get() {
                const chat = this.chat;
                return typeof chat === "string" && chat.endsWith("@newsletter");
            },
            enumerable: true,
        },
        isGroup: {
            get() {
                const chat = this.chat;
                return typeof chat === "string" && chat.endsWith("@g.us");
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
                    if (c?.decodeJid) {
                        return c.decodeJid(cand);
                    }
                    if (typeof cand.decodeJid === "function") {
                        return cand.decodeJid();
                    }
                    return cand;
                });
            },
            enumerable: true,
        },
        fromMe: {
            get() {
                const me = this.conn?.user?.id;
                if (!me) return !!this.key?.fromMe;
                return !!(this.key?.fromMe || areJidsSameUser?.(me, this.sender));
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
                return memo(this, "msg", () => {
                    if (!this.message) return null;
                    const type = this.mtype;
                    return type ? this.message[type] : null;
                });
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
                                return ctx.stanzaId || null;
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
                                if (typeof raw.decodeJid === "function") {
                                    return raw.decodeJid();
                                }
                                return raw;
                            },
                            enumerable: true,
                        },
                        fromMe: {
                            get() {
                                const connId = self.conn?.user?.id;
                                if (!connId) return false;
                                return areJidsSameUser?.(this.sender, connId) || false;
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
                                return s && self.conn?.getName ? self.conn.getName(s) : null;
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
                        download: {
                            value() {
                                const t = this.mediaType;
                                if (!t || !self.conn?.downloadM)
                                    return Promise.resolve(Buffer.alloc(0));

                                return self.conn
                                    .downloadM(this.mediaMessage[t], t.replace(/message/i, ""))
                                    .then((data) =>
                                        Buffer.isBuffer(data) ? data : Buffer.from(data)
                                    )
                                    .catch(() => Buffer.alloc(0));
                            },
                            enumerable: true,
                            configurable: true,
                        },
                        reply: {
                            value(text, chatId, options = {}) {
                                if (!self.conn?.reply) {
                                    return Promise.reject(new Error("Connection not available"));
                                }
                                return self.conn.reply(chatId || this.chat, text, this.vM, options);
                            },
                            enumerable: true,
                        },
                        copy: {
                            value() {
                                if (!self.conn) {
                                    throw new Error("Connection not available");
                                }
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
                                    {
                                        ...options,
                                    }
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
                if (!msg) return "";
                let primary = "";
                if (typeof msg === "string") {
                    primary = msg;
                } else {
                    primary =
                        msg.text ||
                        msg.caption ||
                        msg.contentText ||
                        msg.selectedId ||
                        msg.selectedDisplayText ||
                        "";
                }
                if (typeof primary === "string" && primary.length > 0) {
                    return primary;
                }
                if (msg?.nativeFlowResponseMessage) {
                    const flowMsg = msg.nativeFlowResponseMessage;
                    if (flowMsg.paramsJson) {
                        try {
                            const parsed = JSON.parse(flowMsg.paramsJson);
                            if (parsed?.id) return String(parsed.id);
                        } catch {
                            //
                        }
                    }
                }

                const hydratedText = msg?.hydratedTemplate?.hydratedContentText || "";
                if (hydratedText) return hydratedText;

                return "";
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
                if (this.conn?.getName && this.sender) {
                    return this.conn.getName(this.sender) || "";
                }
                return "";
            },
            enumerable: true,
        },
        download: {
            value() {
                const t = this.mediaType;
                if (!t || !this.conn?.downloadM) {
                    return Promise.resolve(Buffer.alloc(0));
                }
                return this.conn
                    .downloadM(this.mediaMessage[t], t.replace(/message/i, ""))
                    .catch((err) => {
                        console.debug("Download failed:", err);
                        return Buffer.alloc(0);
                    });
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
                if (!this.conn) {
                    throw new Error("Connection not available");
                }
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

                try {
                    const M = this.conn.loadMessage?.(q.id) || q.vM;
                    if (!M) return null;

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
