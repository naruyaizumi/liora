import { RedisStore, EVENT_PRIORITY, REDIS_PREFIX, REDIS_PRESENCE_PREFIX } from "./core.js";

const redisStore = new RedisStore();

export default function bind(conn) {
    redisStore.initPromise.then(() => {
        //
    });

    conn._redisStore = redisStore;

    conn.chats = new Proxy({}, {
        get(target, prop) {
            if (typeof prop === 'string' && prop !== 'constructor') {
                const chatData = redisStore.get(`${REDIS_PREFIX}${prop}`);
                return chatData;
            }
            return target[prop];
        },
        
        set(target, prop, value) {
            if (typeof prop === 'string' && prop !== 'constructor') {
                redisStore.atomicSet(`${REDIS_PREFIX}${prop}`, value, "chat");
                return true;
            }
            target[prop] = value;
            return true;
        },
        
        has(target, prop) {
            if (typeof prop === 'string' && prop !== 'constructor') {
                return true;
            }
            return prop in target;
        },
        
        deleteProperty(target, prop) {
            if (typeof prop === 'string') {
                redisStore.del(`${REDIS_PREFIX}${prop}`);
                return true;
            }
            return delete target[prop];
        }
    });

    conn.getChat = async (jid) => {
        const key = `${REDIS_PREFIX}${jid}`;
        return await redisStore.get(key);
    };

    conn.setChat = async (jid, data) => {
        const key = `${REDIS_PREFIX}${jid}`;
        await redisStore.atomicSet(key, data, "chat");
    };

    conn.getAllChats = async () => {
        const keys = await redisStore.keys(`${REDIS_PREFIX}*`);
        return await redisStore.mget(keys);
    };

    conn.ev.on("messages.upsert", async ({ messages, type }) => {
        redisStore.enqueueEvent("messages.upsert", { messages, type }, EVENT_PRIORITY.CORE);
        
        try {
            for (const msg of messages) {
                const id = msg.key?.remoteJid;
                if (!id || id === "status@broadcast") continue;
                
                let chat = await redisStore.get(`${REDIS_PREFIX}${id}`) || { id };
                chat.conversationTimestamp = msg.messageTimestamp;
                chat.isChats = true;
                
                await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chat, "message");
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("message-receipt.update", async (updates) => {
        redisStore.enqueueEvent("message-receipt.update", updates, EVENT_PRIORITY.CORE);
        
        try {
            for (const { key, receipt } of updates) {
                const id = key?.remoteJid;
                if (!id) continue;
                
                let chat = await redisStore.get(`${REDIS_PREFIX}${id}`);
                if (chat) {
                    chat.lastReceipt = receipt;
                    await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chat, "receipt");
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("chats.set", async ({ chats }) => {
        redisStore.enqueueEvent("chats.set", { chats }, EVENT_PRIORITY.CORE);
        
        try {
            for (let { id, name, readOnly } of chats) {
                id = conn.decodeJid(id);
                if (!id || id === "status@broadcast") continue;
                
                const isGroup = id.endsWith("@g.us");
                let chatData = await redisStore.get(`${REDIS_PREFIX}${id}`) || { id };
                
                chatData.isChats = !readOnly;
                if (name) chatData[isGroup ? "subject" : "name"] = name;
                
                if (isGroup) {
                    const metadata = await conn.groupMetadata(id).catch(() => null);
                    if (name || metadata?.subject) chatData.subject = name || metadata.subject;
                    if (metadata) chatData.metadata = metadata;
                }
                
                await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chatData, "chat");
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("chats.upsert", async (chatsUpsert) => {
        redisStore.enqueueEvent("chats.upsert", chatsUpsert, EVENT_PRIORITY.CORE);
        
        try {
            const { id } = chatsUpsert;
            if (!id || id === "status@broadcast") return;
            
            const existing = await redisStore.get(`${REDIS_PREFIX}${id}`) || {};
            const updated = { ...existing, ...chatsUpsert, isChats: true };
            
            await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, updated, "chat");
            
            if (id.endsWith("@g.us")) {
                conn.insertAllGroup().catch(() => null);
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    function updateNameToDb(contacts) {
        redisStore.enqueueEvent("contacts.update", contacts, EVENT_PRIORITY.CORE);
        
        if (!contacts) return;
        try {
            contacts = contacts.contacts || contacts;
            for (const contact of contacts) {
                const id = conn.decodeJid(contact.id);
                if (!id || id === "status@broadcast") continue;
                
                redisStore.get(`${REDIS_PREFIX}${id}`).then(chats => {
                    if (!chats) chats = { id };
                    
                    const updated = {
                        ...chats,
                        ...contact,
                        id,
                        ...(id.endsWith("@g.us")
                            ? { subject: contact.subject || contact.name || chats.subject || "" }
                            : { name: contact.notify || contact.name || chats.name || chats.notify || "" }),
                    };
                    
                    redisStore.atomicSet(`${REDIS_PREFIX}${id}`, updated, "chat");
                });
            }
        } catch (e) {
            global.logger?.error(e);
        }
    }

    conn.ev.on("contacts.set", updateNameToDb);
    conn.ev.on("contacts.upsert", updateNameToDb);
    conn.ev.on("contacts.update", updateNameToDb);

    conn.ev.on("groups.update", updateNameToDb);

    conn.ev.on("group-participants.update", async function ({ id, participants, action }) {
        redisStore.enqueueEvent("group-participants.update", { id, participants, action }, EVENT_PRIORITY.CORE);
        
        if (!id) return;
        id = conn.decodeJid(id);
        if (id === "status@broadcast") return;
        
        try {
            let chats = await redisStore.get(`${REDIS_PREFIX}${id}`) || { id };
            chats.isChats = true;
            
            const groupMetadata = await conn.groupMetadata(id).catch(() => null);
            if (groupMetadata) {
                chats.subject = groupMetadata.subject;
                chats.metadata = groupMetadata;
            }
            
            await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chats, "chat");
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("presence.update", async function ({ id, presences }) {
        redisStore.enqueueEvent("presence.update", { id, presences }, EVENT_PRIORITY.AUX);
        
        try {
            const sender = Object.keys(presences)[0] || id;
            const _sender = conn.decodeJid(sender);
            const presence = presences[sender]?.lastKnownPresence || "composing";
            
            await redisStore.atomicSet(
                `${REDIS_PRESENCE_PREFIX}${_sender}`,
                { id: _sender, presence, timestamp: Date.now() },
                "presence"
            );
            
            let chats = await redisStore.get(`${REDIS_PREFIX}${_sender}`) || { id: sender };
            chats.presences = presence;
            await redisStore.atomicSet(`${REDIS_PREFIX}${_sender}`, chats, "presence");
            
            if (id.endsWith("@g.us")) {
                let groupChats = await redisStore.get(`${REDIS_PREFIX}${id}`) || { id };
                await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, groupChats, "chat");
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("messages.update", async (updates) => {
        redisStore.enqueueEvent("messages.update", updates, EVENT_PRIORITY.AUX);
        
        try {
            for (const { key, update } of updates) {
                const id = key?.remoteJid;
                if (!id) continue;
                
                let chat = await redisStore.get(`${REDIS_PREFIX}${id}`);
                if (chat) {
                    chat.lastUpdate = Date.now();
                    await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chat, "chat");
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
                
                const existing = await redisStore.get(`${REDIS_PREFIX}${id}`) || { id };
                const updated = { ...existing, ...update };
                
                await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, updated, "chat");
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("messages.reaction", async ({ key, reaction }) => {
        redisStore.enqueueEvent("messages.reaction", { key, reaction }, EVENT_PRIORITY.AUX);
        
        try {
            const id = key?.remoteJid;
            if (id) {
                let chat = await redisStore.get(`${REDIS_PREFIX}${id}`);
                if (chat) {
                    chat.lastReaction = Date.now();
                    await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chat, "chat");
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("messages.delete", async (deletion) => {
        redisStore.enqueueEvent("messages.delete", deletion, EVENT_PRIORITY.NOISE);
        
        try {
            const id = deletion.keys?.[0]?.remoteJid;
            if (id) {
                let chat = await redisStore.get(`${REDIS_PREFIX}${id}`);
                if (chat) {
                    chat.lastMessageDeleted = Date.now();
                    await redisStore.atomicSet(`${REDIS_PREFIX}${id}`, chat, "chat");
                }
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });

    conn.ev.on("chats.delete", async (deletions) => {
        redisStore.enqueueEvent("chats.delete", deletions, EVENT_PRIORITY.NOISE);
        
        try {
            for (const id of deletions) {
                await redisStore.del(`${REDIS_PREFIX}${id}`);
            }
        } catch (e) {
            global.logger?.error(e);
        }
    });
}