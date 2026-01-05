import { proto, areJidsSameUser, extractMessageContent } from "baileys";

const MEDIA_TYPES = new Set([
  "imageMessage",
  "videoMessage",
  "audioMessage",
  "stickerMessage",
  "documentMessage",
]);

const SKIP_TYPES = new Set([
  "senderKeyDistributionMessage",
  "messageContextInfo",
]);

const getFirstKey = (obj) => {
  if (!obj) return null;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return key;
    }
  }
  return null;
};

const firstMeaningfulType = (msg) => {
  if (!msg) return "";
  for (const key in msg) {
    if (Object.prototype.hasOwnProperty.call(msg, key) && !SKIP_TYPES.has(key)) {
      return key;
    }
  }
  return "";
};

const getMediaEnvelope = (root, node) => {
  if (!node) return null;
  if (node.url || node.directPath) return root;
  const extracted = extractMessageContent(root);
  return extracted || null;
};

let smsgCache = null;
const getSmsg = () => {
  if (!smsgCache) {
    const module = require("./smsg.js");
    smsgCache = module.smsg;
  }
  return smsgCache;
};

class QuotedMessage {
  constructor(parent, ctx, quoted, rawNode, type) {
    this._parent = parent;
    this._ctx = ctx;
    this._quoted = quoted;
    this._rawNode = rawNode;
    this._type = type;
    this._textNode = typeof rawNode === "string" ? rawNode : rawNode?.text;
    
    if (rawNode && typeof rawNode === "object") {
      for (const key in rawNode) {
        if (Object.prototype.hasOwnProperty.call(rawNode, key) && key !== 'text') {
          this[key] = rawNode[key];
        }
      }
    }
  }

  get mtype() {
    return this._type;
  }

  get mediaMessage() {
    const env = getMediaEnvelope(this._quoted, this._rawNode);
    if (!env) return null;
    const t = getFirstKey(env);
    return t && MEDIA_TYPES.has(t) ? env : null;
  }

  get mediaType() {
    const m = this.mediaMessage;
    return m ? getFirstKey(m) : null;
  }

  get id() {
    return this._ctx.stanzaId || null;
  }

  get chat() {
    return this._ctx.remoteJid || this._parent.chat;
  }

  get isBaileys() {
    const id = this.id;
    if (!id) return false;
    return id.length === 16 || (id.startsWith("3EB0") && id.length === 12);
  }

  get sender() {
    const raw = this._ctx.participant || this.chat || "";
    const conn = this._parent.conn;
    if (conn?.decodeJid) return conn.decodeJid(raw);
    return raw;
  }

  get fromMe() {
    const connId = this._parent.conn?.user?.id;
    return connId ? areJidsSameUser(this.sender, connId) : false;
  }

  get text() {
    return (
      this._textNode ||
      this.caption ||
      this.contentText ||
      this.selectedDisplayText ||
      ""
    );
  }

  get mentionedJid() {
    return this._rawNode?.contextInfo?.mentionedJid || [];
  }

  get name() {
    const s = this.sender;
    if (!s) return "";
    return this._parent.conn?.getName?.(s) || "";
  }

  get vM() {
    return proto.WebMessageInfo.fromObject({
      key: {
        fromMe: this.fromMe,
        remoteJid: this.chat,
        id: this.id,
      },
      message: this._quoted,
      ...(this._parent.isGroup ? { participant: this.sender } : {}),
    });
  }

  async download() {
    const t = this.mediaType;
    if (!t || !this._parent.conn?.downloadM) return null;
    
    const data = await this._parent.conn.downloadM(
      this.mediaMessage[t],
      t.replace(/message/i, "")
    );
    return data instanceof Uint8Array ? data : new Uint8Array(data || []);
  }

  async reply(text, chatId, options = {}) {
    if (!this._parent.conn?.reply) {
      throw new Error("Connection not available");
    }
    return this._parent.conn.reply(chatId || this.chat, text, this.vM, options);
  }

  async copy() {
    if (!this._parent.conn) throw new Error("Connection not available");
    const M = proto.WebMessageInfo;
    const smsg = getSmsg();
    return smsg(this._parent.conn, M.fromObject(M.toObject(this.vM)));
  }

  async forward(jid, force = false, options = {}) {
    if (!this._parent.conn?.sendMessage) {
      throw new Error("Connection not available");
    }
    return this._parent.conn.sendMessage(
      jid,
      { forward: this.vM, force, ...options },
      options
    );
  }

  async delete() {
    if (!this._parent.conn?.sendMessage) {
      throw new Error("Connection not available");
    }
    return this._parent.conn.sendMessage(this.chat, { delete: this.vM.key });
  }
}

export class Message {
  constructor(raw, conn = null) {
    this._raw = raw;
    this._conn = conn;
    this._processed = false;
    this._botIdCache = null;
    this._botIdCacheTime = 0;
  }

  get conn() {
    return this._conn;
  }

  set conn(value) {
    this._conn = value;
  }

  get key() {
    return this._raw.key;
  }

  get message() {
    return this._raw.message;
  }

  get messageTimestamp() {
    return this._raw.messageTimestamp;
  }

  get pushName() {
    return this._raw.pushName;
  }

  get participant() {
    return this._raw.participant;
  }

  get id() {
    return this._raw.key?.id || null;
  }

  get isBaileys() {
    const id = this.id;
    if (!id) return false;
    return id.length === 16 || (id.startsWith("3EB0") && id.length === 12);
  }

  get chat() {
    const msg = this._raw.message;
    const skdm = msg?.senderKeyDistributionMessage?.groupId;
    const raw =
      this._raw.key?.remoteJid ||
      (skdm && skdm !== "status@broadcast" ? skdm : "") ||
      "";
    
    const conn = this._conn;
    if (conn?.decodeJid) return conn.decodeJid(raw);
    return raw;
  }

  get isChannel() {
    const chat = this.chat;
    return typeof chat === "string" && chat.endsWith("@newsletter");
  }

  get isGroup() {
    const chat = this.chat;
    return typeof chat === "string" && chat.endsWith("@g.us");
  }

  get sender() {
    const conn = this._conn;
    const myId = conn?.user?.id;
    const key = this._raw.key;
    const cand =
      (key?.fromMe && myId) ||
      this._raw.participant ||
      key?.participant ||
      this.chat ||
      "";
    
    if (conn?.decodeJid) return conn.decodeJid(cand);
    return cand;
  }

  get fromMe() {
    const me = this._conn?.user?.id;
    const key = this._raw.key;
    if (!me) return !!key?.fromMe;
    return !!(key?.fromMe || areJidsSameUser(me, this.sender));
  }

  get mtype() {
    return this._raw.message ? firstMeaningfulType(this._raw.message) : "";
  }

  get msg() {
    if (!this._raw.message) return null;
    const type = this.mtype;
    return type ? this._raw.message[type] : null;
  }

  get mediaMessage() {
    if (!this._raw.message) return null;
    const env = getMediaEnvelope(this._raw.message, this.msg);
    if (!env) return null;
    const t = getFirstKey(env);
    return t && MEDIA_TYPES.has(t) ? env : null;
  }

  get mediaType() {
    const m = this.mediaMessage;
    return m ? getFirstKey(m) : null;
  }

  get quoted() {
    const baseMsg = this.msg;
    const ctx = baseMsg?.contextInfo;
    const quoted = ctx?.quotedMessage;
    
    if (!baseMsg || !ctx || !quoted) return null;
    
    const type = getFirstKey(quoted);
    if (!type) return null;
    
    const rawNode = quoted[type];
    return new QuotedMessage(this, ctx, quoted, rawNode, type);
  }

  get text() {
    const msg = this.msg;
    if (!msg) return "";
    if (typeof msg === "string") return msg;
    
    if (msg.text) return msg.text;
    if (msg.caption) return msg.caption;
    if (msg.contentText) return msg.contentText;
    if (msg.selectedId) return msg.selectedId;
    if (msg.selectedDisplayText) return msg.selectedDisplayText;
    
    const nfr = msg.nativeFlowResponseMessage?.paramsJson;
    if (nfr) {
      try {
        const idMatch = nfr.match(/"id"\s*:\s*"([^"]+)"/);
        if (idMatch) return idMatch[1];
      } catch {}
    }
    
    return msg.hydratedTemplate?.hydratedContentText || "";
  }

  get mentionedJid() {
    const ctx = this.msg?.contextInfo;
    const arr = ctx?.mentionedJid;
    return Array.isArray(arr) && arr.length ? arr : [];
  }

  get name() {
    const pn = this._raw.pushName;
    if (pn != null && pn !== "") return pn;
    
    const sender = this.sender;
    if (!sender) return "";
    
    return this._conn?.getName?.(sender) || "";
  }

  async download() {
    const t = this.mediaType;
    if (!t || !this._conn?.downloadM) return null;
    
    const data = await this._conn.downloadM(
      this.mediaMessage[t],
      t.replace(/message/i, "")
    );
    return data instanceof Uint8Array ? data : new Uint8Array(data || []);
  }

  async reply(text, chatId, options = {}) {
    if (!this._conn?.reply) {
      throw new Error("Connection not available");
    }
    return this._conn.reply(chatId || this.chat, text, this._raw, options);
  }

  async copy() {
    if (!this._conn) throw new Error("Connection not available");
    const M = proto.WebMessageInfo;
    const smsg = getSmsg();
    return smsg(this._conn, M.fromObject(M.toObject(this._raw)));
  }

  async forward(jid, force = false, options = {}) {
    if (!this._conn?.sendMessage) {
      throw new Error("Connection not available");
    }
    return this._conn.sendMessage(
      jid,
      { forward: this._raw, force, ...options },
      options
    );
  }

  getQuotedObj() {
    const q = this.quoted;
    if (!q?.id || !this._conn) return null;
    
    const M = this._conn.loadMessage?.(q.id) || q.vM;
    if (!M) return null;
    
    const smsg = getSmsg();
    return smsg(this._conn, proto.WebMessageInfo.fromObject(M));
  }

  get getQuotedMessage() {
    return this.getQuotedObj.bind(this);
  }

  async delete() {
    if (!this._conn?.sendMessage) {
      throw new Error("Connection not available");
    }
    return this._conn.sendMessage(this.chat, { delete: this._raw.key });
  }

  _getBotId() {
    const now = Date.now();
    if (this._botIdCache && (now - this._botIdCacheTime < 60000)) {
      return this._botIdCache;
    }
    
    const conn = this._conn;
    const botId = conn?.decodeJid?.(conn.user?.lid || "") || "";
    this._botIdCache = botId;
    this._botIdCacheTime = now;
    return botId;
  }

  process() {
    if (this._processed) return this;
    
    const msg = this._raw.message;
    if (!msg) {
      this._processed = true;
      return this;
    }

    const conn = this._conn;
    if (!conn) {
      this._processed = true;
      return this;
    }

    try {
      if (this.mtype === "protocolMessage" && this.msg?.key) {
        const key = { ...this.msg.key };

        if (key.remoteJid === "status@broadcast" && this.chat) {
          key.remoteJid = this.chat;
        }

        if ((!key.participant || key.participant === "status_me") && this.sender) {
          key.participant = this.sender;
        }

        const botId = this._getBotId();
        if (botId) {
          const partId = conn.decodeJid?.(key.participant) || "";
          key.fromMe = partId === botId;

          if (!key.fromMe && key.remoteJid === botId && this.sender) {
            key.remoteJid = this.sender;
          }
        }

        this.msg.key = key;
        conn.ev?.emit("messages.delete", { keys: [key] });
      }

      const q = this.quoted;
      if (q && !q.mediaMessage && q.download !== undefined) {
        delete q.download;
      }
      
      if (!this.mediaMessage && this.download !== undefined) {
        delete this.download;
      }
    } catch (e) {
      if (global.logger?.error) {
        global.logger.error(e.message);
      }
    }

    this._processed = true;
    return this;
  }
}

export function serialize() {
  return Message;
}