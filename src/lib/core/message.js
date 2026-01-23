/**
 * @file Message serialization and prototype extension
 * @module core/message
 * @description Extends WhatsApp WebMessageInfo prototype with utility methods
 * and properties for enhanced message handling in Liora bot.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { smsg } from "./smsg.js";
import { proto, areJidsSameUser, extractMessageContent } from "baileys";

/**
 * Set of recognized media message types
 * @constant {Set<string>}
 */
const MEDIA_TYPES = new Set([
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "stickerMessage",
    "documentMessage",
]);

/**
 * Fast object keys extraction with null safety
 * @function fastKeys
 * @param {Object} o - Object to extract keys from
 * @returns {Array<string>} Array of keys or empty array
 */
const fastKeys = (o) => (o && typeof o === "object" ? Object.keys(o) : []);

/**
 * Safe property access with hasOwnProperty check
 * @function safeGet
 * @param {Object} o - Source object
 * @param {string} k - Property key
 * @returns {*} Property value or undefined
 */
const safeGet = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);

/**
 * Extracts primary message type, skipping protocol headers
 * @function firstMeaningfulType
 * @param {Object} msg - Message object
 * @returns {string} Primary message type
 */
const firstMeaningfulType = (msg) => {
    const keys = fastKeys(msg);
    if (!keys.length) return "";
    const skipTypes = new Set(["senderKeyDistributionMessage", "messageContextInfo"]);
    for (const key of keys) {
        if (!skipTypes.has(key)) return key;
    }
    return keys[keys.length - 1];
};

/**
 * Extracts media envelope from message structure
 * @function getMediaEnvelope
 * @param {Object} root - Root message object
 * @param {Object} node - Media node
 * @returns {Object|null} Media envelope or null
 */
const getMediaEnvelope = (root, node) => {
    if (!node) return null;
    if (node?.url || node?.directPath) return root;
    const extracted = extractMessageContent(root);
    return extracted || null;
};

/**
 * Creates enhanced quoted message object with utility methods
 * @function createQuotedMessage
 * @param {Object} self - Parent message context
 * @param {Object} ctx - Context information
 * @param {Object} quoted - Quoted message object
 * @param {Object|string} rawNode - Raw message node
 * @param {string} type - Message type
 * @returns {Object} Enhanced quoted message
 */
const createQuotedMessage = (self, ctx, quoted, rawNode, type) => {
    const textNode = typeof rawNode === "string" ? rawNode : rawNode?.text;
    const base = typeof rawNode === "string" ? { text: rawNode } : rawNode || {};
    const out = Object.create(base);

    return Object.defineProperties(out, {
        mtype: {
            get: () => type,
            enumerable: true,
        },
        mediaMessage: {
            get() {
                const env = getMediaEnvelope(quoted, rawNode);
                if (!env) return null;
                const t = fastKeys(env)[0];
                return MEDIA_TYPES.has(t) ? env : null;
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
            get: () => ctx.stanzaId || null,
            enumerable: true,
        },
        chat: {
            get: () => ctx.remoteJid || self.chat,
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
        sender: {
            get() {
                const raw = ctx.participant || this.chat || "";
                const sock = self.sock;
                if (sock?.decodeJid) return sock.decodeJid(raw);
                if (typeof raw.decodeJid === "function") return raw.decodeJid();
                return raw;
            },
            enumerable: true,
        },
        fromMe: {
            get() {
                const connId = self.sock?.user?.id;
                return connId ? areJidsSameUser?.(this.sender, connId) || false : false;
            },
            enumerable: true,
        },
        text: {
            get() {
                return (
                    textNode || this.caption || this.contentText || this.selectedDisplayText || ""
                );
            },
            enumerable: true,
        },
        mentionedJid: {
            get() {
                return rawNode?.contextInfo?.mentionedJid || [];
            },
            enumerable: true,
        },
        name: {
            get() {
                const s = this.sender;
                if (!s) return "";
                return self.sock?.getName ? self.sock.getName(s) : "";
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
            async value() {
                const t = this.mediaType;
                if (!t || !self.sock?.downloadM) return Buffer.alloc(0);

                try {
                    const data = await self.sock.downloadM(
                        this.mediaMessage[t],
                        t.replace(/message/i, "")
                    );
                    return Buffer.isBuffer(data) ? data : Buffer.alloc(0);
                } catch {
                    return Buffer.alloc(0);
                }
            },
            enumerable: true,
            configurable: true,
        },
        reply: {
            value(text, chatId, options = {}) {
                if (!self.sock?.reply) {
                    throw new Error("Connection not available");
                }
                return self.sock.reply(chatId || this.chat, text, this.vM, options);
            },
            enumerable: true,
        },
        copy: {
            value() {
                if (!self.sock) throw new Error("Connection not available");
                const M = proto.WebMessageInfo;
                return smsg(self.sock, M.fromObject(M.toObject(this.vM)));
            },
            enumerable: true,
        },
        forward: {
            value(jid, force = false, options = {}) {
                if (!self.sock?.sendMessage) {
                    throw new Error("Connection not available");
                }
                return self.sock.sendMessage(jid, { forward: this.vM, force, ...options }, options);
            },
            enumerable: true,
        },
        delete: {
            value() {
                if (!self.sock?.sendMessage) {
                    throw new Error("Connection not available");
                }
                return self.sock.sendMessage(this.chat, { delete: this.vM.key });
            },
            enumerable: true,
        },
    });
};

/**
 * Extends WebMessageInfo prototype with Liora-specific utilities
 * @export
 * @function serialize
 * @returns {Object} Modified prototype
 *
 * @extendedProperties
 * - Connection management (.sock)
 * - Message metadata (.id, .chat, .sender, .mtype)
 * - Media handling (.mediaMessage, .mediaType, .download)
 * - Quoted message utilities (.quoted, .getQuotedObj)
 * - Action methods (.reply, .copy, .forward, .delete)
 * - Context detection (.isGroup, .isChannel, .isBaileys)
 *
 * @performance
 * - Uses getters for lazy evaluation
 * - Minimal property creation overhead
 * - Efficient media detection
 * - Connection-aware utilities
 */
export function serialize() {
    return Object.defineProperties(proto.WebMessageInfo.prototype, {
        /**
         * Connection reference for message operations
         * @property {Object} conn
         */
        sock: {
            value: undefined,
            enumerable: false,
            writable: true,
        },

        /**
         * Message identifier
         * @property {string} id
         */
        id: {
            get() {
                return this.key?.id || null;
            },
            enumerable: true,
        },

        /**
         * Checks if message is from Baileys
         * @property {boolean} isBaileys
         */
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

        /**
         * Chat identifier with normalization
         * @property {string} chat
         */
        chat: {
            get() {
                const skdm = this.message?.senderKeyDistributionMessage?.groupId;
                const raw =
                    this.key?.remoteJid || (skdm && skdm !== "status@broadcast" ? skdm : "") || "";

                const sock = this.sock;
                if (sock?.decodeJid) return sock.decodeJid(raw);
                if (typeof raw.decodeJid === "function") return raw.decodeJid();
                return raw;
            },
            enumerable: true,
        },

        /**
         * Checks if chat is a newsletter channel
         * @property {boolean} isChannel
         */
        isChannel: {
            get() {
                const chat = this.chat;
                return typeof chat === "string" && chat.endsWith("@newsletter");
            },
            enumerable: true,
        },

        /**
         * Checks if chat is a group
         * @property {boolean} isGroup
         */
        isGroup: {
            get() {
                const chat = this.chat;
                return typeof chat === "string" && chat.endsWith("@g.us");
            },
            enumerable: true,
        },

        /**
         * Sender identifier with JID normalization
         * @property {string} sender
         */
        sender: {
            get() {
                const sock = this.sock;
                const myId = sock?.user?.id;
                const cand =
                    (this.key?.fromMe && myId) ||
                    this.participant ||
                    this.key?.participant ||
                    this.chat ||
                    "";

                if (sock?.decodeJid) return sock.decodeJid(cand);
                if (typeof cand.decodeJid === "function") return cand.decodeJid();
                return cand;
            },
            enumerable: true,
        },

        /**
         * Checks if message is from current user
         * @property {boolean} fromMe
         */
        fromMe: {
            get() {
                const me = this.sock?.user?.id;
                if (!me) return !!this.key?.fromMe;
                return !!(this.key?.fromMe || areJidsSameUser?.(me, this.sender));
            },
            enumerable: true,
        },

        /**
         * Primary message type
         * @property {string} mtype
         */
        mtype: {
            get() {
                return this.message ? firstMeaningfulType(this.message) : "";
            },
            enumerable: true,
        },

        /**
         * Message content object
         * @property {Object} msg
         */
        msg: {
            get() {
                if (!this.message) return null;
                const type = this.mtype;
                return type ? this.message[type] : null;
            },
            enumerable: true,
        },

        /**
         * Media message envelope
         * @property {Object} mediaMessage
         */
        mediaMessage: {
            get() {
                if (!this.message) return null;
                const env = getMediaEnvelope(this.message, this.msg);
                if (!env) return null;
                const t = fastKeys(env)[0];
                return MEDIA_TYPES.has(t) ? env : null;
            },
            enumerable: true,
        },

        /**
         * Media type identifier
         * @property {string} mediaType
         */
        mediaType: {
            get() {
                const m = this.mediaMessage;
                return m ? fastKeys(m)[0] : null;
            },
            enumerable: true,
        },

        /**
         * Quoted message with utilities
         * @property {Object} quoted
         */
        quoted: {
            get() {
                const baseMsg = this.msg;
                const ctx = baseMsg?.contextInfo;
                const quoted = ctx?.quotedMessage;

                if (!baseMsg || !ctx || !quoted) return null;

                const type = fastKeys(quoted)[0];
                if (!type) return null;

                const rawNode = quoted[type];
                return createQuotedMessage(this, ctx, quoted, rawNode, type);
            },
            enumerable: true,
        },

        /**
         * Extracted text content
         * @property {string} text
         */
        text: {
            get() {
                const msg = this.msg;
                if (!msg) return "";
                if (typeof msg === "string") return msg;
                const primary =
                    msg.text ||
                    msg.caption ||
                    msg.contentText ||
                    msg.selectedId ||
                    msg.selectedDisplayText ||
                    "";
                if (primary) return primary;
                if (msg.nativeFlowResponseMessage?.paramsJson) {
                    try {
                        const parsed = JSON.parse(msg.nativeFlowResponseMessage.paramsJson);
                        if (parsed?.id) return String(parsed.id);
                    } catch {
                        //
                    }
                }

                return msg.hydratedTemplate?.hydratedContentText || "";
            },
            enumerable: true,
        },

        /**
         * Mentioned user JIDs
         * @property {Array<string>} mentionedJid
         */
        mentionedJid: {
            get() {
                const arr = safeGet(this.msg?.contextInfo || {}, "mentionedJid");
                return Array.isArray(arr) && arr.length ? arr : [];
            },
            enumerable: true,
        },

        /**
         * Sender display name
         * @property {string} name
         */
        name: {
            get() {
                const pn = this.pushName;
                if (pn != null && pn !== "") return pn;
                const sender = this.sender;
                if (!sender) return "";
                return this.sock?.getName ? this.sock.getName(sender) : "";
            },
            enumerable: true,
        },

        /**
         * Downloads media content
         * @method download
         * @returns {Promise<Buffer>} Media buffer
         */
        download: {
            async value() {
                const t = this.mediaType;
                if (!t || !this.sock?.downloadM) return Buffer.alloc(0);

                try {
                    const data = await this.sock.downloadM(
                        this.mediaMessage[t],
                        t.replace(/message/i, "")
                    );
                    return Buffer.isBuffer(data) ? data : Buffer.alloc(0);
                } catch {
                    return Buffer.alloc(0);
                }
            },
            enumerable: true,
            configurable: true,
        },

        /**
         * Replies to this message
         * @method reply
         * @param {string} text - Reply text
         * @param {string} chatId - Target chat (optional)
         * @param {Object} options - Send options
         * @returns {Promise<Object>} Send result
         */
        reply: {
            value(text, chatId, options = {}) {
                if (!this.sock?.reply) {
                    throw new Error("Connection not available");
                }
                return this.sock.reply(chatId || this.chat, text, this, options);
            },
            enumerable: true,
        },

        /**
         * Creates a copy of this message
         * @method copy
         * @returns {Object} Copied message
         */
        copy: {
            value() {
                if (!this.sock) throw new Error("Connection not available");
                const M = proto.WebMessageInfo;
                return smsg(this.sock, M.fromObject(M.toObject(this)));
            },
            enumerable: true,
        },

        /**
         * Forwards this message
         * @method forward
         * @param {string} jid - Target JID
         * @param {boolean} force - Force forward
         * @param {Object} options - Forward options
         * @returns {Promise<Object>} Forward result
         */
        forward: {
            value(jid, force = false, options = {}) {
                if (!this.sock?.sendMessage) {
                    throw new Error("Connection not available");
                }
                return this.sock.sendMessage(jid, { forward: this, force, ...options }, options);
            },
            enumerable: true,
        },

        /**
         * Retrieves full quoted message object
         * @method getQuotedObj
         * @returns {Object|null} Quoted message or null
         */
        getQuotedObj: {
            value() {
                const q = this.quoted;
                if (!q?.id || !this.sock) return null;

                try {
                    const M = this.sock.loadMessage?.(q.id) || q.vM;
                    if (!M) return null;

                    return smsg(this.sock, proto.WebMessageInfo.fromObject(M));
                } catch {
                    return null;
                }
            },
            enumerable: true,
        },

        /**
         * Alias for getQuotedObj
         * @property {Function} getQuotedMessage
         */
        getQuotedMessage: {
            get() {
                return this.getQuotedObj;
            },
            enumerable: true,
        },

        /**
         * Deletes this message
         * @method delete
         * @returns {Promise<Object>} Delete result
         */
        delete: {
            value() {
                if (!this.sock?.sendMessage) {
                    throw new Error("Connection not available");
                }
                return this.sock.sendMessage(this.chat, { delete: this.key });
            },
            enumerable: true,
        },
    });
}
