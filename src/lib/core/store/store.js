import {
  RedisStore,
  EVENT_PRIORITY,
  REDIS_PREFIX,
  REDIS_PRESENCE_PREFIX,
  REDIS_MESSAGE_PREFIX,
  REDIS_CONTACT_PREFIX,
  REDIS_GROUP_PREFIX,
  REDIS_CALL_PREFIX,
  REDIS_LABEL_PREFIX,
  REDIS_BLOCKLIST_PREFIX,
} from "./core.js";

const redisStore = new RedisStore();

export default function bind(conn) {
  redisStore.initPromise.then(() => {
    global.logger?.info("Redis store initialized");
  });

  conn._redisStore = redisStore;
  
  conn.getChat = async (jid) => {
    const key = `${REDIS_PREFIX}${jid}`;
    const data = await redisStore.get(key);
    return data || null;
  };

  conn.setChat = async (jid, data) => {
    const key = `${REDIS_PREFIX}${jid}`;
    await redisStore.atomicSet(key, data, "chat");
  };

  conn.deleteChat = async (jid) => {
    const key = `${REDIS_PREFIX}${jid}`;
    await redisStore.del(key);
  };

  conn.getAllChats = async () => {
    const keys = await redisStore.keys(`${REDIS_PREFIX}*`);
    const chats = await redisStore.mget(keys);
    return chats.filter(c => c !== null);
  };
  
  conn.getContact = async (jid) => {
    const key = `${REDIS_CONTACT_PREFIX}${jid}`;
    return await redisStore.get(key);
  };

  conn.setContact = async (jid, data) => {
    const key = `${REDIS_CONTACT_PREFIX}${jid}`;
    await redisStore.atomicSet(key, data, "contact");
  };

  conn.getAllContacts = async () => {
    const keys = await redisStore.keys(`${REDIS_CONTACT_PREFIX}*`);
    return await redisStore.mget(keys);
  };

  conn.getMessage = async (chatId, messageId) => {
    const key = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
    return await redisStore.get(key);
  };

  conn.setMessage = async (chatId, messageId, data) => {
    const key = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
    await redisStore.atomicSet(key, data, "message");
  };

  conn.getChatMessages = async (chatId, limit = 40) => {
    const pattern = `${REDIS_MESSAGE_PREFIX}${chatId}:*`;
    const keys = await redisStore.keys(pattern);
    const messages = await redisStore.mget(keys);
    return messages.filter(m => m !== null).slice(-limit);
  };

  conn.getGroupMetadata = async (groupId) => {
    const key = `${REDIS_GROUP_PREFIX}${groupId}`;
    return await redisStore.get(key);
  };

  conn.setGroupMetadata = async (groupId, metadata) => {
    const key = `${REDIS_GROUP_PREFIX}${groupId}`;
    await redisStore.atomicSet(key, metadata, "group");
  };
  
  conn.getPresence = async (jid) => {
    const key = `${REDIS_PRESENCE_PREFIX}${jid}`;
    return await redisStore.get(key);
  };

  conn.setPresence = async (jid, presence) => {
    const key = `${REDIS_PRESENCE_PREFIX}${jid}`;
    await redisStore.atomicSet(key, presence, "presence");
  };

  conn.getCall = async (callId) => {
    const key = `${REDIS_CALL_PREFIX}${callId}`;
    return await redisStore.get(key);
  };

  conn.setCall = async (callId, callData) => {
    const key = `${REDIS_CALL_PREFIX}${callId}`;
    await redisStore.atomicSet(key, callData, "call");
  };

  conn.getLabel = async (labelId) => {
    const key = `${REDIS_LABEL_PREFIX}${labelId}`;
    return await redisStore.get(key);
  };

  conn.setLabel = async (labelId, labelData) => {
    const key = `${REDIS_LABEL_PREFIX}${labelId}`;
    await redisStore.atomicSet(key, labelData, "label");
  };

  conn.getBlocklist = async () => {
    const key = `${REDIS_BLOCKLIST_PREFIX}list`;
    return await redisStore.get(key) || [];
  };

  conn.setBlocklist = async (blocklist) => {
    const key = `${REDIS_BLOCKLIST_PREFIX}list`;
    await redisStore.atomicSet(key, blocklist, "blocklist");
  };

  conn.ev.on("connection.update", async (update) => {
    redisStore.enqueueEvent("connection.update", update, EVENT_PRIORITY.CORE);
    
    try {
      if (update.connection === "open") {
        global.logger?.info("Connection established - syncing data");
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("creds.update", async (update) => {
    redisStore.enqueueEvent("creds.update", update, EVENT_PRIORITY.CORE);
  });

  conn.ev.on("messaging-history.set", async ({ chats, contacts, messages, isLatest }) => {
    redisStore.enqueueEvent("messaging-history.set", { chats, contacts, messages, isLatest }, EVENT_PRIORITY.CORE);

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

          await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chatData, "chat");

          if (isGroup) {
            try {
              const metadata = await conn.groupMetadata(id);
              if (metadata) {
                await conn.setGroupMetadata(id, metadata);
                chatData.metadata = metadata;
                await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chatData, "chat");
              }
            } catch {}
          }
        }
      }
      
      if (contacts) {
        for (const contact of contacts) {
          const id = conn.decodeJid(contact.id);
          if (!id || id === "status@broadcast") continue;

          await conn.setContact(id, {
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
              await conn.setMessage(chatId, messageId, msg);
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

  conn.ev.on("messages.upsert", async ({ messages, type }) => {
    redisStore.enqueueEvent("messages.upsert", { messages, type }, EVENT_PRIORITY.CORE);

    try {
      for (const msg of messages) {
        const chatId = msg.key?.remoteJid;
        const messageId = msg.key?.id;
        
        if (!chatId || !messageId || chatId === "status@broadcast") continue;

        await conn.setMessage(chatId, messageId, msg);

        let chat = await conn.getChat(chatId) || { id: chatId };
        chat.conversationTimestamp = msg.messageTimestamp;
        chat.isChats = true;
        
        if (!msg.key?.fromMe) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        await conn.setChat(chatId, chat);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("messages.update", async (updates) => {
    redisStore.enqueueEvent("messages.update", updates, EVENT_PRIORITY.CORE);

    try {
      for (const { key, update } of updates) {
        const chatId = key?.remoteJid;
        const messageId = key?.id;
        
        if (!chatId || !messageId) continue;

        const msg = await conn.getMessage(chatId, messageId);
        if (msg) {
          Object.assign(msg, update);
          await conn.setMessage(chatId, messageId, msg);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("messages.delete", async (deletion) => {
    redisStore.enqueueEvent("messages.delete", deletion, EVENT_PRIORITY.CORE);

    try {
      if (deletion.keys) {
        for (const key of deletion.keys) {
          const chatId = key?.remoteJid;
          const messageId = key?.id;
          
          if (chatId && messageId) {
            const msgKey = `${REDIS_MESSAGE_PREFIX}${chatId}:${messageId}`;
            await redisStore.del(msgKey);
          }
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("messages.reaction", async ({ key, reaction }) => {
    redisStore.enqueueEvent("messages.reaction", { key, reaction }, EVENT_PRIORITY.AUX);

    try {
      const chatId = key?.remoteJid;
      const messageId = key?.id;
      
      if (chatId && messageId) {
        const msg = await conn.getMessage(chatId, messageId);
        if (msg) {
          msg.reactions ||= [];
          msg.reactions.push(reaction);
          await conn.setMessage(chatId, messageId, msg);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("message-receipt.update", async (updates) => {
    redisStore.enqueueEvent("message-receipt.update", updates, EVENT_PRIORITY.AUX);

    try {
      for (const { key, receipt } of updates) {
        const chatId = key?.remoteJid;
        const messageId = key?.id;
        
        if (chatId && messageId) {
          const msg = await conn.getMessage(chatId, messageId);
          if (msg) {
            msg.userReceipt ||= [];
            msg.userReceipt.push(receipt);
            await conn.setMessage(chatId, messageId, msg);
          }
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.set", async ({ chats, isLatest }) => {
    redisStore.enqueueEvent("chats.set", { chats, isLatest }, EVENT_PRIORITY.CORE);

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

        await conn.setChat(id, chatData);

        if (isGroup) {
          try {
            const metadata = await conn.groupMetadata(id);
            if (metadata) {
              await conn.setGroupMetadata(id, metadata);
              chatData.metadata = metadata;
              await conn.setChat(id, chatData);
            }
          } catch {}
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.upsert", async (chats) => {
    redisStore.enqueueEvent("chats.upsert", chats, EVENT_PRIORITY.CORE);

    try {
      for (const chat of chats) {
        const id = conn.decodeJid(chat.id);
        if (!id || id === "status@broadcast") continue;

        const existing = await conn.getChat(id) || { id };
        const updated = { ...existing, ...chat, isChats: true };

        await conn.setChat(id, updated);

        if (id.endsWith("@g.us") && !updated.metadata) {
          try {
            const metadata = await conn.groupMetadata(id);
            if (metadata) {
              await conn.setGroupMetadata(id, metadata);
              updated.metadata = metadata;
              await conn.setChat(id, updated);
            }
          } catch {}
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.update", async (updates) => {
    redisStore.enqueueEvent("chats.update", updates, EVENT_PRIORITY.AUX);

    try {
      for (const update of updates) {
        const id = conn.decodeJid(update.id);
        if (!id || id === "status@broadcast") continue;

        const existing = await conn.getChat(id) || { id };
        const updated = { ...existing, ...update };

        await conn.setChat(id, updated);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("chats.delete", async (deletions) => {
    redisStore.enqueueEvent("chats.delete", deletions, EVENT_PRIORITY.NOISE);

    try {
      for (const id of deletions) {
        await conn.deleteChat(id);
        
        const msgKeys = await redisStore.keys(`${REDIS_MESSAGE_PREFIX}${id}:*`);
        for (const key of msgKeys) {
          await redisStore.del(key);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("presence.update", async ({ id, presences }) => {
    redisStore.enqueueEvent("presence.update", { id, presences }, EVENT_PRIORITY.AUX);

    try {
      for (const [jid, presence] of Object.entries(presences)) {
        const _jid = conn.decodeJid(jid);
        
        await conn.setPresence(_jid, {
          id: _jid,
          lastKnownPresence: presence.lastKnownPresence,
          lastSeen: presence.lastSeen,
          timestamp: Date.now(),
        });

        const chat = await conn.getChat(_jid);
        if (chat) {
          chat.presences = presence.lastKnownPresence;
          await conn.setChat(_jid, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("contacts.set", async ({ contacts }) => {
    redisStore.enqueueEvent("contacts.set", { contacts }, EVENT_PRIORITY.CORE);

    try {
      for (const contact of contacts) {
        const id = conn.decodeJid(contact.id);
        if (!id || id === "status@broadcast") continue;

        await conn.setContact(id, {
          id,
          name: contact.name || contact.notify || contact.verifiedName,
          notify: contact.notify,
          verifiedName: contact.verifiedName,
          imgUrl: contact.imgUrl,
          status: contact.status,
        });

        const chat = await conn.getChat(id);
        if (chat && !id.endsWith("@g.us")) {
          chat.name = contact.name || contact.notify || chat.name;
          await conn.setChat(id, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });
  
  conn.ev.on("contacts.upsert", async (contacts) => {
    redisStore.enqueueEvent("contacts.upsert", contacts, EVENT_PRIORITY.CORE);

    try {
      for (const contact of contacts) {
        const id = conn.decodeJid(contact.id);
        if (!id || id === "status@broadcast") continue;

        const existing = await conn.getContact(id) || { id };
        const updated = { ...existing, ...contact };

        await conn.setContact(id, updated);

        const chat = await conn.getChat(id);
        if (chat && !id.endsWith("@g.us")) {
          chat.name = updated.name || updated.notify || chat.name;
          await conn.setChat(id, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });
  
  conn.ev.on("contacts.update", async (updates) => {
    redisStore.enqueueEvent("contacts.update", updates, EVENT_PRIORITY.AUX);

    try {
      for (const update of updates) {
        const id = conn.decodeJid(update.id);
        if (!id || id === "status@broadcast") continue;

        const existing = await conn.getContact(id) || { id };
        const updated = { ...existing, ...update };

        await conn.setContact(id, updated);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("groups.upsert", async (groups) => {
    redisStore.enqueueEvent("groups.upsert", groups, EVENT_PRIORITY.CORE);

    try {
      for (const group of groups) {
        const id = conn.decodeJid(group.id);
        if (!id) continue;

        await conn.setGroupMetadata(id, group);

        const chat = await conn.getChat(id) || { id };
        chat.subject = group.subject;
        chat.metadata = group;
        chat.isChats = true;
        await conn.setChat(id, chat);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });
  
  conn.ev.on("groups.update", async (updates) => {
    redisStore.enqueueEvent("groups.update", updates, EVENT_PRIORITY.CORE);

    try {
      for (const update of updates) {
        const id = conn.decodeJid(update.id);
        if (!id) continue;

        const existing = await conn.getGroupMetadata(id) || { id };
        const updated = { ...existing, ...update };

        await conn.setGroupMetadata(id, updated);

        const chat = await conn.getChat(id);
        if (chat) {
          if (update.subject) chat.subject = update.subject;
          chat.metadata = updated;
          await conn.setChat(id, chat);
        }
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("group-participants.update", async ({ id, participants, action }) => {
    redisStore.enqueueEvent("group-participants.update", { id, participants, action }, EVENT_PRIORITY.CORE);

    try {
      id = conn.decodeJid(id);
      if (!id || id === "status@broadcast") return;

      const metadata = await conn.groupMetadata(id).catch(() => null);
      if (metadata) {
        await conn.setGroupMetadata(id, metadata);

        const chat = await conn.getChat(id) || { id };
        chat.subject = metadata.subject;
        chat.metadata = metadata;
        chat.isChats = true;
        await conn.setChat(id, chat);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("call", async (calls) => {
    redisStore.enqueueEvent("call", calls, EVENT_PRIORITY.CORE);

    try {
      for (const call of calls) {
        const callId = call.id;
        if (callId) {
          await conn.setCall(callId, {
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

  conn.ev.on("labels.edit", async (label) => {
    redisStore.enqueueEvent("labels.edit", label, EVENT_PRIORITY.AUX);

    try {
      await conn.setLabel(label.id, label);
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("labels.association", async ({ association, type }) => {
    redisStore.enqueueEvent("labels.association", { association, type }, EVENT_PRIORITY.AUX);

    try {
      const { chatId, labelId } = association;
      const chat = await conn.getChat(chatId);
      
      if (chat) {
        chat.labels ||= [];
        if (type === "add" && !chat.labels.includes(labelId)) {
          chat.labels.push(labelId);
        } else if (type === "remove") {
          chat.labels = chat.labels.filter(l => l !== labelId);
        }
        await conn.setChat(chatId, chat);
      }
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("blocklist.set", async ({ blocklist }) => {
    redisStore.enqueueEvent("blocklist.set", { blocklist }, EVENT_PRIORITY.CORE);

    try {
      await conn.setBlocklist(blocklist);
    } catch (e) {
      global.logger?.error(e);
    }
  });

  conn.ev.on("blocklist.update", async ({ blocklist, type }) => {
    redisStore.enqueueEvent("blocklist.update", { blocklist, type }, EVENT_PRIORITY.CORE);

    try {
      const existing = await conn.getBlocklist();
      
      if (type === "add") {
        for (const jid of blocklist) {
          if (!existing.includes(jid)) {
            existing.push(jid);
          }
        }
      } else if (type === "remove") {
        const filtered = existing.filter(jid => !blocklist.includes(jid));
        await conn.setBlocklist(filtered);
        return;
      }
      
      await conn.setBlocklist(existing);
    } catch (e) {
      global.logger?.error(e);
    }
  });
}