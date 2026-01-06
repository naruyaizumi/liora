import {
  RedisStore,
  EVENT_PRIORITY,
  REDIS_PREFIX,
  REDIS_PRESENCE_PREFIX,
  REDIS_CONTACT_PREFIX,
  REDIS_GROUP_PREFIX,
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

        const existing = (await conn.getContact(id)) || { id };
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

  conn.ev.on("chats.set", async ({ chats, isLatest }) => {
    redisStore.enqueueEvent(
      "chats.set",
      { chats, isLatest },
      EVENT_PRIORITY.CORE,
    );

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

  conn.ev.on("groups.update", async (updates) => {
    redisStore.enqueueEvent("groups.update", updates, EVENT_PRIORITY.CORE);

    try {
      for (const update of updates) {
        const id = conn.decodeJid(update.id);
        if (!id) continue;

        const existing = (await conn.getGroupMetadata(id)) || { id };
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

  conn.ev.on(
    "group-participants.update",
    async ({ id, participants, action }) => {
      redisStore.enqueueEvent(
        "group-participants.update",
        { id, participants, action },
        EVENT_PRIORITY.CORE,
      );

      try {
        id = conn.decodeJid(id);
        if (!id || id === "status@broadcast") return;

        const metadata = await conn.groupMetadata(id).catch(() => null);
        if (metadata) {
          await conn.setGroupMetadata(id, metadata);

          const chat = (await conn.getChat(id)) || { id };
          chat.subject = metadata.subject;
          chat.metadata = metadata;
          chat.isChats = true;
          await conn.setChat(id, chat);
        }
      } catch (e) {
        global.logger?.error(e);
      }
    },
  );

  conn.ev.on("presence.update", async ({ id, presences }) => {
    redisStore.enqueueEvent(
      "presence.update",
      { id, presences },
      EVENT_PRIORITY.AUX,
    );

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
}
