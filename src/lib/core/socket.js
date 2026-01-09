import bind from "./store/store.js";
import { smsg } from "./smsg.js";
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
  return cleaned.includes("@") ?
    cleaned :
    /^[0-9]+$/.test(cleaned) ?
    cleaned + "@s.whatsapp.net" :
    cleaned;
};

class MessageQueue {
  constructor() {
    this.tasks = [];
    this.running = false;
    this.batchSize = 10;
  }
  
  add(task) {
    this.tasks.push(task);
    if (!this.running) {
      this.running = true;
      setImmediate(() => this.process());
    }
  }
  
  async process() {
    while (this.tasks.length > 0) {
      const batch = this.tasks.splice(0, this.batchSize);
      await Promise.all(
        batch.map((task) =>
          task().catch((e) =>
            global.logger?.error({ error: e.message }, "Queue error"),
          ),
        ),
      );
    }
    this.running = false;
  }
}

const messageQueue = new MessageQueue();

export function naruyaizumi(connectionOptions, options = {}) {
  const conn = makeWASocket(connectionOptions);
  
  bind(conn);
  
  conn.decodeJid = decodeJid;
  
  const sender = new mods(conn);
  conn.client = sender.client.bind(sender);
  
  conn.reply = async (jid, text = "", quoted, options = {}) => {
    let ephemeral = false;
    try {
      const chat = await conn.getChat(jid);
      ephemeral =
        chat?.metadata?.ephemeralDuration || chat?.ephemeralDuration ||
        false;
    } catch (e) {
      global.logger?.error({ error: e.message, jid }, "getChat error");
    }
    
    text = typeof text === "string" ? text.trim() : String(text || "");
    
    return conn.sendMessage(
      jid,
      {
        text,
        ...options,
      },
      {
        quoted,
        ephemeralExpiration: ephemeral,
      },
    );
  };
  
  conn.downloadM = async (m, type) => {
    if (!m || !(m.url || m.directPath)) return new Uint8Array(0);
    
    try {
      const nodeStream = await downloadContentFromMessage(m, type);
      const chunks = [];
      
      for await (const chunk of nodeStream) {
        if (chunk instanceof Uint8Array) {
          chunks.push(chunk);
        } else if (Buffer.isBuffer(chunk)) {
          chunks.push(new Uint8Array(chunk));
        } else {
          chunks.push(new Uint8Array(Buffer.from(chunk)));
        }
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length,
        0);
      const result = new Uint8Array(totalLength);
      
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    } catch {
      return new Uint8Array(0);
    }
  };
  
  conn.getName = async (jid = "", withoutContact = false) => {
    jid = conn.decodeJid(jid);
    if (!jid || withoutContact) return jid || "";
    
    if (isGroupJid(jid)) {
      try {
        const chat = await conn.getChat(jid);
        if (chat?.subject) return chat.subject;
        
        const md = await conn.groupMetadata(jid);
        if (md?.subject) {
          conn
            .setChat(jid, {
              ...(chat || { id: jid }),
              subject: md.subject,
              metadata: md,
            })
            .catch(() => {});
          return md.subject;
        }
      } catch {
        return jid;
      }
    }
    
    const self =
      conn.user?.lid && areJidsSameUser ?
      areJidsSameUser(jid, conn.user.lid) :
      false;
    
    if (self) return conn.user?.name || jid;
    
    try {
      const chat = await conn.getChat(jid);
      return chat?.name || chat?.notify || jid;
    } catch {
      return jid;
    }
  };
  
  conn.loadMessage = async (messageID) => {
    if (!messageID) return null;
    
    try {
      const allChats = await conn.getAllChats();
      for (const chatData of allChats) {
        const msg = chatData?.messages?.[messageID];
        if (msg) return msg;
      }
    } catch (e) {
      global.logger?.error({ error: e.message }, "loadMessage error");
    }
    
    return null;
  };
  
  conn.processMessageStubType = async (m) => {
    if (!m?.messageStubType) return;
    
    const chat = conn.decodeJid(
      m.key?.remoteJid ||
      m.message?.senderKeyDistributionMessage?.groupId ||
      "",
    );
    
    if (!chat || isStatusJid(chat)) return;
    
    const name =
      Object.entries(WAMessageStubType).find(
        ([, v]) => v === m.messageStubType,
      )?.[0] || "UNKNOWN";
    
    const author = conn.decodeJid(
      m.key?.participant || m.participant || m.key?.remoteJid || "",
    );
    
    global.logger?.warn({
      module: "PROTOCOL",
      event: name,
      chat,
      author,
      params: m.messageStubParameters || [],
    });
  };
  
  conn.insertAllGroup = async () => {
    try {
      const allGroups = await conn
        .groupFetchAllParticipating()
        .catch(() => ({}));
      
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
            
            await conn.setChat(gid, chat);
          }),
        );
      }
      
      return allGroups;
    } catch (e) {
      global.logger?.error(e);
      return {};
    }
  };
  
  conn.pushMessage = (m) => {
    if (!m) return;
    
    const messages = Array.isArray(m) ? m : [m];
    
    messages.forEach((message) => {
      messageQueue.add(async () => {
        try {
          if (
            message.messageStubType &&
            message.messageStubType !== WAMessageStubType.CIPHERTEXT
          ) {
            await conn.processMessageStubType(message);
          }
          
          const msgObj = message.message || {};
          const mtypeKeys = Object.keys(msgObj);
          if (!mtypeKeys.length) return;
          
          let mtype = mtypeKeys.find(
            (k) =>
            k !== "senderKeyDistributionMessage" &&
            k !== "messageContextInfo",
          );
          if (!mtype) mtype = mtypeKeys[mtypeKeys.length - 1];
          
          const chat = conn.decodeJid(
            message.key?.remoteJid ||
            msgObj?.senderKeyDistributionMessage?.groupId ||
            "",
          );
          
          if (!chat || isStatusJid(chat)) return;
          
          let chatData = await conn.getChat(chat);
          if (!chatData) {
            chatData = { id: chat, isChats: true };
          }
          
          const isGroup = isGroupJid(chat);
          
          if (isGroup && !chatData.metadata) {
            try {
              const md = await conn.groupMetadata(chat);
              chatData.subject = md.subject;
              chatData.metadata = md;
            } catch (e) {}
          }
          
          const ctx = msgObj[mtype]?.contextInfo;
          if (ctx?.quotedMessage && ctx.stanzaId) {
            const qChat = conn.decodeJid(
              ctx.remoteJid || ctx.participant || chat,
            );
            
            if (qChat && !isStatusJid(qChat)) {
              try {
                let qm = await conn.getChat(qChat);
                if (!qm) {
                  qm = { id: qChat, isChats: !isGroupJid(qChat) };
                }
                
                qm.messages ||= {};
                
                if (!qm.messages[ctx.stanzaId]) {
                  const quotedMsg = {
                    key: {
                      remoteJid: qChat,
                      fromMe: conn.user?.lid && areJidsSameUser ?
                        areJidsSameUser(conn.user.lid, qChat) :
                        false,
                      id: ctx.stanzaId,
                      participant: conn.decodeJid(ctx
                        .participant),
                    },
                    message: ctx.quotedMessage,
                    ...(qChat.endsWith("@g.us") ?
                    {
                      participant: conn.decodeJid(ctx
                        .participant),
                    } : {}),
                  };
                  
                  qm.messages[ctx.stanzaId] = quotedMsg;
                  
                  const msgKeys = Object.keys(qm.messages);
                  if (msgKeys.length > 30) {
                    for (let i = 0; i < msgKeys.length - 20; i++) {
                      delete qm.messages[msgKeys[i]];
                    }
                  }
                  
                  await conn.setChat(qChat, qm);
                }
              } catch (e) {}
            }
          }
          
          if (!isGroup) {
            const sender =
              message.key?.fromMe && conn.user?.lid ? conn.user
              .lid : chat;
            chatData.name = message.pushName || chatData.name || "";
          } else {
            const sender = conn.decodeJid(
              (message.key?.fromMe && conn.user?.lid) ||
              message.participant ||
              message.key?.participant ||
              chat,
            );
            
            if (sender && sender !== chat) {
              try {
                const sChat = (await conn.getChat(sender)) ||
                { id: sender };
                sChat.name = message.pushName || sChat.name || "";
                await conn.setChat(sender, sChat);
              } catch (e) {}
            }
          }
          
          if (mtype !== "senderKeyDistributionMessage") {
            const sender = isGroup ?
              conn.decodeJid(
                (message.key?.fromMe && conn.user?.lid) ||
                message.participant ||
                message.key?.participant ||
                chat,
              ) :
              message.key?.fromMe && conn.user?.lid ?
              conn.user.lid :
              chat;
            
            const fromMe =
              message.key?.fromMe ||
              (conn.user?.lid && sender && areJidsSameUser ?
                areJidsSameUser(sender, conn.user?.lid) :
                false);
            
            if (
              !fromMe &&
              message.message &&
              message.messageStubType !== WAMessageStubType
              .CIPHERTEXT &&
              message.key?.id
            ) {
              const cleanMsg = { ...message };
              if (cleanMsg.message) {
                delete cleanMsg.message.messageContextInfo;
                delete cleanMsg.message
                  .senderKeyDistributionMessage;
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
          
          await conn.setChat(chat, chatData);
        } catch (e) {
          global.logger?.error({ error: e.message },
            "pushMessage error");
        }
      });
    });
  };
  
  conn.serializeM = (m) => smsg(conn, m);
  
  if (conn.user?.lid) {
    conn.user.lid = conn.decodeJid(conn.user.lid);
  }
  
  return conn;
}