import { MemoryStore, EVENT_PRIORITY } from "./core.js";

const REDIS_PREFIX = "liora:chat:";
const REDIS_PRESENCE_PREFIX = "liora:presence:";
const REDIS_MESSAGE_PREFIX = "liora:message:";
const REDIS_CONTACT_PREFIX = "liora:contact:";
const REDIS_GROUP_PREFIX = "liora:group:";
const REDIS_CALL_PREFIX = "liora:call:";
const REDIS_BLOCKLIST_PREFIX = "liora:blocklist:";

const memoryStore = new MemoryStore();

export default function bind(conn) {
  global.logger?.info("Memory store initialized");

  conn._memoryStore = memoryStore;
  
  conn.getChat = (jid) => {
    const key = `${REDIS_PREFIX}${jid}`;
    return memoryStore.get(key);
  };

  conn.setChat = (jid, data) => {
    const key = `${REDIS_PREFIX}${jid}`;
    memoryStore.atomicSet(key, data, "chat");
  };

  conn.deleteChat = (jid) => {
    const key = `${REDIS_PREFIX}${jid}`;
    memoryStore.del(key);
  };

  conn.getAllChats = () => {
    const keys = memoryStore.keys(`${REDIS_PREFIX}*`);
    const chats = memoryStore.mget(keys);
    return chats.filter(c => c !== null);
  };
  
  conn.getContact = (jid) => {
    const key = `${REDIS_CONTACT_PREFIX}${jid}`;
    return memoryStore.get(key);
  };

  conn.setContact = (jid, data) => {
    const key = `${REDIS_CONTACT_PREFIX}${jid}`;
    memoryStore.atomicSet(key, data, "contact");
  };

  conn.getAllContacts = () => {
    const keys = memoryStore.keys(`${REDIS_CONTACT_PREFIX}*`);
    return memoryStore.mget(keys);
  };

  conn.getMessage = (chatId, messageId) => {
    const key = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
    return memoryStore.get(key);
  };

  conn.setMessage = (chatId, messageId, data) => {
    const key = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
    memoryStore.atomicSet(key, data, "message");
  };

  conn.getChatMessages = (chatId, limit = 40) => {
    const pattern = `${REDIS_MESSAGE_PREFIX}${chatId}:*`;
    const keys = memoryStore.keys(pattern);
    const messages = memoryStore.mget(keys);
    return messages.filter(m => m !== null).slice(-limit);
  };

  conn.getGroupMetadata = (groupId) => {
    const key = `${REDIS_GROUP_PREFIX}${groupId}`;
    return memoryStore.get(key);
  };

  conn.setGroupMetadata = (groupId, metadata) => {
    const key = `${REDIS_GROUP_PREFIX}${groupId}`;
    memoryStore.atomicSet(key, metadata, "group");
  };
  
  conn.getPresence = (jid) => {
    const key = `${REDIS_PRESENCE_PREFIX}${jid}`;
    return memoryStore.get(key);
  };

  conn.setPresence = (jid, presence) => {
    const key = `${REDIS_PRESENCE_PREFIX}${jid}`;
    memoryStore.atomicSet(key, presence, "presence");
  };

  conn.getCall = (callId) => {
    const key = `${REDIS_CALL_PREFIX}${callId}`;
    return memoryStore.get(key);
  };

  conn.setCall = (callId, callData) => {
    const key = `${REDIS_CALL_PREFIX}${callId}`;
    memoryStore.atomicSet(key, callData, "call");
  };

  conn.getBlocklist = () => {
    const key = `${REDIS_BLOCKLIST_PREFIX}list`;
    return memoryStore.get(key) || [];
  };

  conn.setBlocklist = (blocklist) => {
    const key = `${REDIS_BLOCKLIST_PREFIX}list`;
    memoryStore.atomicSet(key, blocklist, "blocklist");
  };

  conn.ev.on("connection.update", (update) => {
    memoryStore.enqueueEvent("connection.update", update, EVENT_PRIORITY.CORE);
    
    try {
      if (update.connection === "open") {
        global.logger?.info("Connection established - syncing data");
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("creds.update", (update) => {
    memoryStore.enqueueEvent("creds.update", update, EVENT_PRIORITY.CORE);
  });

  conn.ev.on("messaging-history.set", ({ chats, contacts, messages, isLatest }) => {
    memoryStore.enqueueEvent("messaging-history.set", { chats, contacts, messages, isLatest }, EVENT_PRIORITY.CORE);

    try {
      if (chats) {
        for (const chat of chats) {
          const id = conn.decodeJid(chat.id);
          if (!id || id === "status@broadcast") continue;

          const isGroup = id.endsWith("@g.us");
          const chatData = {
            id,
            conversationTimestamp: chat.conversationTimestamp,
            unreadCount: chat.unreadCount || 0,
            archived: chat.archived || false,
            pinned: chat.pinned || 0,
            muteEndTime: chat.muteEndTime,
            name: chat.name,
            isChats: true,
            ...(isGroup && { subject: chat.name }),
          };

          memoryStore.atomicSet(`${REDIS_PREFIX}${id}`, chatData, "chat");

          if (isGroup) {
            conn.groupMetadata(id).then(metadata => {
              if (metadata) {
                conn.setGroupMetadata(id, metadata);
                chatData.metadata = metadata;
                memoryStore.atomicSet(`${REDIS_PREFIX}${id}`, chatData, "chat");
              }
            }).catch(() => {});
          }
        }
      }
      
      if (contacts) {
        for (const contact of contacts) {
          const id = conn.decodeJid(contact.id);
          if (!id || id === "status@broadcast") continue;

          conn.setContact(id, {
            id,
            name: contact.name || contact.notify || contact.verifiedName,
            notify: contact.notify,
            verifiedName: contact.verifiedName,
            imgUrl: contact.imgUrl,
            status: contact.status,
          });
        }
      }

      if (messages) {
        const messagesByChat = {};
        
        for (const msg of messages) {
          const chatId = msg.key?.remoteJid;
          if (!chatId || chatId === "status@broadcast") continue;

          if (!messagesByChat[chatId]) {
            messagesByChat[chatId] = [];
          }
          messagesByChat[chatId].push(msg);
        }

        for (const [chatId, msgs] of Object.entries(messagesByChat)) {
          const toSave = msgs.slice(-40);
          
          for (const msg of toSave) {
            const messageId = msg.key?.id;
            if (messageId) {
              conn.setMessage(chatId, messageId, msg);
            }
          }
        }
      }

      global.logger?.info({
        chats: chats?.length || 0,
        contacts: contacts?.length || 0,
        messages: messages?.length || 0,
        isLatest,
      }, "Messaging history synced");
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("messages.upsert", ({ messages, type }) => {
    memoryStore.enqueueEvent("messages.upsert", { messages, type }, EVENT_PRIORITY.CORE);

    try {
      for (const msg of messages) {
        const chatId = msg.key?.remoteJid;
        const messageId = msg.key?.id;
        
        if (!chatId || !messageId || chatId === "status@broadcast") continue;

        conn.setMessage(chatId, messageId, msg);

        let chat = conn.getChat(chatId) || { id: chatId };
        chat.conversationTimestamp = msg.messageTimestamp;
        chat.isChats = true;
        
        if (!msg.key?.fromMe) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        conn.setChat(chatId, chat);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("messages.update", (updates) => {
    memoryStore.enqueueEvent("messages.update", updates, EVENT_PRIORITY.CORE);

    try {
      for (const { key, update } of updates) {
        const chatId = key?.remoteJid;
        const messageId = key?.id;
        
        if (!chatId || !messageId) continue;

        const msg = conn.getMessage(chatId, messageId);
        if (msg) {
          Object.assign(msg, update);
          conn.setMessage(chatId, messageId, msg);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("messages.delete", (deletion) => {
    memoryStore.enqueueEvent("messages.delete", deletion, EVENT_PRIORITY.CORE);

    try {
      if (deletion.keys) {
        for (const key of deletion.keys) {
          const chatId = key?.remoteJid;
          const messageId = key?.id;
          
          if (chatId && messageId) {
            const msgKey = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
            memoryStore.del(msgKey);
          }
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("messages.reaction", ({ key, reaction }) => {
    memoryStore.enqueueEvent("messages.reaction", { key, reaction }, EVENT_PRIORITY.AUX);

    try {
      const chatId = key?.remoteJid;
      const messageId = key?.id;
      
      if (chatId && messageId) {
        const msg = conn.getMessage(chatId, messageId);
        if (msg) {
          msg.reactions ||= [];
          msg.reactions.push(reaction);
          conn.setMessage(chatId, messageId, msg);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("message-receipt.update", (updates) => {
    memoryStore.enqueueEvent("message-receipt.update", updates, EVENT_PRIORITY.AUX);

    try {
      for (const { key, receipt } of updates) {
        const chatId = key?.remoteJid;
        const messageId = key?.id;
        
        if (chatId && messageId) {
          const msg = conn.getMessage(chatId, messageId);
          if (msg) {
            msg.userReceipt ||= [];
            msg.userReceipt.push(receipt);
            conn.setMessage(chatId, messageId, msg);
          }
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.set", ({ chats, isLatest }) => {
    memoryStore.enqueueEvent("chats.set", { chats, isLatest }, EVENT_PRIORITY.CORE);

    try {
      for (const chat of chats) {
        let id = conn.decodeJid(chat.id);
        if (!id || id === "status@broadcast") continue;

        const isGroup = id.endsWith("@g.us");
        const chatData = {
          id,
          conversationTimestamp: chat.conversationTimestamp,
          unreadCount: chat.unreadCount || 0,
          archived: chat.archived || false,
          pinned: chat.pinned || 0,
          muteEndTime: chat.muteEndTime,
          isChats: !chat.readOnly,
          ...(isGroup ? { subject: chat.name } : { name: chat.name }),
        };

        conn.setChat(id, chatData);

        if (isGroup) {
          conn.groupMetadata(id).then(metadata => {
            if (metadata) {
              conn.setGroupMetadata(id, metadata);
              chatData.metadata = metadata;
              conn.setChat(id, chatData);
            }
          }).catch(() => {});
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.upsert", (chats) => {
    memoryStore.enqueueEvent("chats.upsert", chats, EVENT_PRIORITY.CORE);

    try {
      for (const chat of chats) {
        const id = conn.decodeJid(chat.id);
        if (!id || id === "status@broadcast") continue;

        const existing = conn.getChat(id) || { id };
        const updated = { ...existing, ...chat, isChats: true };

        conn.setChat(id, updated);

        if (id.endsWith("@g.us") && !updated.metadata) {
          conn.groupMetadata(id).then(metadata => {
            if (metadata) {
              conn.setGroupMetadata(id, metadata);
              updated.metadata = metadata;
              conn.setChat(id, updated);
            }
          }).catch(() => {});
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.update", (updates) => {
    memoryStore.enqueueEvent("chats.update", updates, EVENT_PRIORITY.AUX);

    try {
      for (const update of updates) {
        const id = conn.decodeJid(update.id);
        if (!id || id === "status@broadcast") continue;

        const existing = conn.getChat(id) || { id };
        const updated = { ...existing, ...update };

        conn.setChat(id, updated);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.delete", (deletions) => {
    memoryStore.enqueueEvent("chats.delete", deletions, EVENT_PRIORITY.NOISE);

    try {
      for (const id of deletions) {
        conn.deleteChat(id);
        
        const msgKeys = memoryStore.keys(`${REDIS_MESSAGE_PREFIX}${id}:*`);
        for (const key of msgKeys) {
          memoryStore.del(key);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("presence.update", ({ id, presences }) => {
    memoryStore.enqueueEvent("presence.update", { id, presences }, EVENT_PRIORITY.AUX);

    try {
      for (const [jid, presence] of Object.entries(presences)) {
        const _jid = conn.decodeJid(jid);
        
        conn.setPresence(_jid, {
          id: _jid,
          lastKnownPresence: presence.lastKnownPresence,
          lastSeen: presence.lastSeen,
          timestamp: Date.now(),
        });

        const chat = conn.getChat(_jid);
        if (chat) {
          chat.presences = presence.lastKnownPresence;
          conn.setChat(_jid, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("contacts.set", ({ contacts }) => {
    memoryStore.enqueueEvent("contacts.set", { contacts }, EVENT_PRIORITY.CORE);

    try {
      for (const contact of contacts) {
        const id = conn.decodeJid(contact.id);
        if (!id || id === "status@broadcast") continue;

        conn.setContact(id, {
          id,
          name: contact.name || contact.notify || contact.verifiedName,
          notify: contact.notify,
          verifiedName: contact.verifiedName,
          imgUrl: contact.imgUrl,
          status: contact.status,
        });

        const chat = conn.getChat(id);
        if (chat && !id.endsWith("@g.us")) {
          chat.name = contact.name || contact.notify || chat.name;
          conn.setChat(id, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });
  
  conn.ev.on("contacts.upsert", (contacts) => {
    memoryStore.enqueueEvent("contacts.upsert", contacts, EVENT_PRIORITY.CORE);

    try {
      for (const contact of contacts) {
        const id = conn.decodeJid(contact.id);
        if (!id || id === "status@broadcast") continue;

        const existing = conn.getContact(id) || { id };
        const updated = { ...existing, ...contact };

        conn.setContact(id, updated);

        const chat = conn.getChat(id);
        if (chat && !id.endsWith("@g.us")) {
          chat.name = updated.name || updated.notify || chat.name;
          conn.setChat(id, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });
  
  conn.ev.on("contacts.update", (updates) => {
    memoryStore.enqueueEvent("contacts.update", updates, EVENT_PRIORITY.AUX);

    try {
      for (const update of updates) {
        const id = conn.decodeJid(update.id);
        if (!id || id === "status@broadcast") continue;

        const existing = conn.getContact(id) || { id };
        const updated = { ...existing, ...update };

        conn.setContact(id, updated);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("groups.upsert", (groups) => {
    memoryStore.enqueueEvent("groups.upsert", groups, EVENT_PRIORITY.CORE);

    try {
      for (const group of groups) {
        const id = conn.decodeJid(group.id);
        if (!id) continue;

        conn.setGroupMetadata(id, group);

        const chat = conn.getChat(id) || { id };
        chat.subject = group.subject;
        chat.metadata = group;
        chat.isChats = true;
        conn.setChat(id, chat);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });
  
  conn.ev.on("groups.update", (updates) => {
    memoryStore.enqueueEvent("groups.update", updates, EVENT_PRIORITY.CORE);

    try {
      for (const update of updates) {
        const id = conn.decodeJid(update.id);
        if (!id) continue;

        const existing = conn.getGroupMetadata(id) || { id };
        const updated = { ...existing, ...update };

        conn.setGroupMetadata(id, updated);

        const chat = conn.getChat(id);
        if (chat) {
          if (update.subject) chat.subject = update.subject;
          chat.metadata = updated;
          conn.setChat(id, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("group-participants.update", ({ id, participants, action }) => {
    memoryStore.enqueueEvent("group-participants.update", { id, participants, action }, EVENT_PRIORITY.CORE);

    try {
      id = conn.decodeJid(id);
      if (!id || id === "status@broadcast") return;

      conn.groupMetadata(id).then(metadata => {
        if (metadata) {
          conn.setGroupMetadata(id, metadata);

          const chat = conn.getChat(id) || { id };
          chat.subject = metadata.subject;
          chat.metadata = metadata;
          chat.isChats = true;
          conn.setChat(id, chat);
        }
      }).catch(() => {});
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("call", (calls) => {
    memoryStore.enqueueEvent("call", calls, EVENT_PRIORITY.CORE);

    try {
      for (const call of calls) {
        const callId = call.id;
        if (callId) {
          conn.setCall(callId, {
            id: callId,
            from: call.from,
            timestamp: call.timestamp,
            isVideo: call.isVideo,
            isGroup: call.isGroup,
            status: call.status,
          });
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("blocklist.set", ({ blocklist }) => {
    memoryStore.enqueueEvent("blocklist.set", { blocklist }, EVENT_PRIORITY.CORE);

    try {
      conn.setBlocklist(blocklist);
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("blocklist.update", ({ blocklist, type }) => {
    memoryStore.enqueueEvent("blocklist.update", { blocklist, type }, EVENT_PRIORITY.CORE);

    try {
      const existing = conn.getBlocklist();
      
      if (type === "add") {
        for (const jid of blocklist) {
          if (!existing.includes(jid)) {
            existing.push(jid);
          }
        }
      } else if (type === "remove") {
        const filtered = existing.filter(jid => !blocklist.includes(jid));
        conn.setBlocklist(filtered);
        return;
      }
      
      conn.setBlocklist(existing);
    } catch (e) {
      global.logger?.error(e);
    }
  });
}
