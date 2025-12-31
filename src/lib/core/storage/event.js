import { StoreManager } from "./manager.js";

const isGroup = (id) => typeof id === "string" && id.endsWith("@g.us");
const isStatus = (id) => !id || id === "status@broadcast";

function generateMessageId(msg) {
    return msg.key?.id || `${msg.key?.remoteJid || "unknown"}-${Date.now()}`;
}

export function createEventHandlers(conn, manager) {
    return {
        "messaging-history.set": async ({ chats, contacts, messages }) => {
            await manager.queue.add(async () => {
                try {
                    await Promise.all([
                        contacts?.length > 0
                            ? Promise.all(
                                  contacts.map(async (contact) => {
                                      if (!contact?.id) return;
                                      const id = conn.decodeJid(contact.id);
                                      if (isStatus(id)) return;

                                      await manager.setContact(id, contact);
                                      manager.stats.contactsProcessed++;
                                  })
                              )
                            : Promise.resolve(),

                        chats?.length > 0
                            ? (async () => {
                                  const groupsToFetch = [];
                                  await Promise.all(
                                      chats.map(async (chat) => {
                                          if (!chat?.id) return;
                                          const id = conn.decodeJid(chat.id);
                                          if (isStatus(id)) return;

                                          const existing = (await manager.getChat(id)) || { id };
                                          const updated = { ...existing, ...chat, isChats: true };

                                          await manager.setChat(id, updated);
                                          conn.chats[id] = updated;
                                          manager.stats.chatsProcessed++;

                                          if (isGroup(id)) groupsToFetch.push(id);
                                      })
                                  );

                                  if (groupsToFetch.length > 0) {
                                      const batchSize = 5;
                                      for (let i = 0; i < groupsToFetch.length; i += batchSize) {
                                          const batch = groupsToFetch.slice(i, i + batchSize);
                                          await Promise.allSettled(
                                              batch.map((id) =>
                                                  manager.fetchGroupMetadata(conn, id)
                                              )
                                          );
                                      }
                                  }
                              })()
                            : Promise.resolve(),

                        messages?.length > 0
                            ? Promise.all(
                                  messages.map(async (msg) => {
                                      if (!msg?.message) return;
                                      const msgId = generateMessageId(msg);
                                      await manager.setMessage(msgId, msg);
                                      manager.stats.messagesProcessed++;
                                  })
                              )
                            : Promise.resolve(),
                    ]);
                    manager.emit("history-sync:completed");
                } catch (err) {
                    global.logger.error({ err }, "History sync error");
                    manager.stats.errorsCount++;
                }
            });
        },

        "messages.upsert": async ({ messages }) => {
            await Promise.all(
                messages.map(async (msg) => {
                    if (!msg?.message) return;

                    const msgId = generateMessageId(msg);
                    const remoteJid = msg.key?.remoteJid;

                    if (isStatus(remoteJid)) return;

                    await manager.setMessage(msgId, msg);
                    manager.stats.messagesProcessed++;

                    if (remoteJid) {
                        const existing = (await manager.getChat(remoteJid)) || { id: remoteJid };
                        const updated = {
                            ...existing,
                            isChats: true,
                            conversationTimestamp: msg.messageTimestamp,
                        };

                        await manager.setChat(remoteJid, updated);
                        conn.chats[remoteJid] = updated;
                    }

                    manager.emit("message:upserted", { message: msg });
                })
            );
        },

        "messages.update": async (updates) => {
            await Promise.all(
                updates.map(async (update) => {
                    const msgId = update.key?.id;
                    if (!msgId) return;

                    const existing = await manager.getMessage(msgId);
                    if (existing) {
                        const updated = { ...existing, ...update };
                        await manager.setMessage(msgId, updated);
                    }

                    manager.emit("message:updated", update);
                })
            );
        },

        "messages.delete": async (deletions) => {
            if (deletions.keys) {
                await Promise.all(
                    deletions.keys.map(async (key) => {
                        const msgId = key.id;
                        if (msgId) {
                            await manager.messageCache.delete(msgId);
                            manager.emit("message:deleted", key);
                        }
                    })
                );
            } else if (deletions.jid) {
                manager.emit("messages:cleared", deletions.jid);
            }
        },

        "messages.reaction": async (reactions) => {
            for (const reaction of reactions) {
                manager.emit("message:reaction", reaction);
            }
        },

        "message-receipt.update": async (receipts) => {
            for (const receipt of receipts) {
                manager.emit("message:receipt", receipt);
            }
        },

        "chats.upsert": async (chatsUpsert) => {
            const chatsArray = Array.isArray(chatsUpsert) ? chatsUpsert : [chatsUpsert];
            const groupsToInsert = [];

            await Promise.all(
                chatsArray.map(async (chatData) => {
                    if (!chatData?.id || isStatus(chatData.id)) return;

                    const { id } = chatData;
                    const existing = (await manager.getChat(id)) || { id };
                    const chat = { ...existing, ...chatData, isChats: true };

                    await manager.setChat(id, chat);
                    conn.chats[id] = chat;
                    manager.stats.chatsProcessed++;

                    if (isGroup(id)) groupsToInsert.push(id);

                    manager.emit("chat:upserted", chat);
                })
            );

            if (groupsToInsert.length > 0 && conn.insertAllGroup) {
                conn.insertAllGroup().catch((err) =>
                    global.logger.warn({ err }, "Failed to insert all groups")
                );
            }
        },

        "chats.update": async (chatsUpdate) => {
            const updates = Array.isArray(chatsUpdate) ? chatsUpdate : [chatsUpdate];

            await Promise.all(
                updates.map(async (update) => {
                    if (!update?.id) return;
                    const id = conn.decodeJid(update.id);
                    if (isStatus(id)) return;

                    const existing = (await manager.getChat(id)) || { id };
                    const chat = { ...existing, ...update };

                    await manager.setChat(id, chat);
                    conn.chats[id] = chat;

                    manager.emit("chat:updated", chat);
                })
            );
        },

        "chats.delete": async (deletions) => {
            const ids = Array.isArray(deletions) ? deletions : [deletions];

            await Promise.all(
                ids.map(async (id) => {
                    if (isStatus(id)) return;

                    await manager.chatCache.delete(id);
                    delete conn.chats[id];

                    manager.emit("chat:deleted", id);
                })
            );
        },

        "chats.set": async ({ chats: chatsUpdate }) => {
            const updates = [];

            await Promise.all(
                chatsUpdate.map(async ({ id, name, readOnly }) => {
                    id = conn.decodeJid(id);
                    if (isStatus(id)) return;

                    const existing = (await manager.getChat(id)) || { id };
                    const chat = { ...existing, isChats: !readOnly };

                    if (name) {
                        chat[isGroup(id) ? "subject" : "name"] = name;
                    }

                    if (isGroup(id)) {
                        updates.push({ id, chat, name });
                    } else {
                        await manager.setChat(id, chat);
                        conn.chats[id] = chat;
                    }
                })
            );

            if (updates.length > 0) {
                await Promise.all(
                    updates.map(async ({ id, chat, name }) => {
                        const metadata = await manager.fetchGroupMetadata(conn, id);
                        if (metadata) {
                            chat.subject = name || metadata.subject;
                            chat.metadata = metadata;
                        }
                        await manager.setChat(id, chat);
                        conn.chats[id] = chat;
                    })
                );
            }
        },

        "contacts.upsert": async (contacts) => {
            const contactArray = Array.isArray(contacts)
                ? contacts
                : contacts.contacts
                  ? Array.isArray(contacts.contacts)
                      ? contacts.contacts
                      : [contacts.contacts]
                  : [contacts];

            await Promise.all(
                contactArray.map(async (contact) => {
                    if (!contact?.id) return;

                    const id = conn.decodeJid(contact.id);
                    if (isStatus(id)) return;

                    await manager.setContact(id, contact);
                    manager.stats.contactsProcessed++;

                    const existing = (await manager.getChat(id)) || { id };
                    const update = { ...existing, ...contact, id };

                    if (isGroup(id)) {
                        const newSubject =
                            contact.subject || contact.name || existing.subject || "";
                        if (newSubject) update.subject = newSubject;
                    } else {
                        const newName =
                            contact.notify ||
                            contact.name ||
                            existing.name ||
                            existing.notify ||
                            "";
                        if (newName) update.name = newName;
                    }

                    await manager.setChat(id, update);
                    conn.chats[id] = update;

                    manager.emit("contact:upserted", contact);
                })
            );
        },

        "contacts.update": async (updates) => {
            const updateArray = Array.isArray(updates) ? updates : [updates];

            await Promise.all(
                updateArray.map(async (update) => {
                    if (!update?.id) return;

                    const id = conn.decodeJid(update.id);
                    if (isStatus(id)) return;

                    const existing = (await manager.getContact(id)) || { id };
                    const contact = { ...existing, ...update };

                    await manager.setContact(id, contact);
                    manager.emit("contact:updated", contact);
                })
            );
        },

        "groups.upsert": async (groupsUpsert) => {
            const groups = Array.isArray(groupsUpsert) ? groupsUpsert : [groupsUpsert];

            await Promise.all(
                groups.map(async (group) => {
                    if (!group?.id) return;
                    const id = conn.decodeJid(group.id);
                    if (isStatus(id) || !isGroup(id)) return;

                    const existing = (await manager.getChat(id)) || { id };
                    const chat = { ...existing, ...group, isChats: true };

                    await manager.setChat(id, chat);
                    conn.chats[id] = chat;

                    await manager.fetchGroupMetadata(conn, id);

                    manager.emit("group:upserted", chat);
                })
            );
        },

        "groups.update": async (groupsUpdates) => {
            const updatesArray = Array.isArray(groupsUpdates) ? groupsUpdates : [groupsUpdates];
            const validUpdates = [];

            for (const update of updatesArray) {
                if (!update?.id) continue;

                const id = conn.decodeJid(update.id);
                if (isStatus(id) || !isGroup(id)) continue;

                validUpdates.push({ id, update });
            }

            await Promise.allSettled(
                validUpdates.map(async ({ id, update }) => {
                    const existing = (await manager.getChat(id)) || { id };
                    const chat = { ...existing, isChats: true };

                    const metadata = await manager.fetchGroupMetadata(conn, id, true);
                    if (metadata) {
                        chat.metadata = metadata;
                        chat.subject = update.subject || metadata.subject;
                    } else if (update.subject) {
                        chat.subject = update.subject;
                    }

                    await manager.setChat(id, chat);
                    conn.chats[id] = chat;

                    manager.emit("group:updated", chat);
                })
            );
        },

        "group-participants.update": async ({ id, participants, action }) => {
            if (!id) return;
            id = conn.decodeJid(id);
            if (isStatus(id)) return;

            const existing = (await manager.getChat(id)) || { id };
            const chat = { ...existing, isChats: true };

            const metadata = await manager.fetchGroupMetadata(conn, id, true);
            if (metadata) {
                chat.subject = metadata.subject;
                chat.metadata = metadata;
            }

            await manager.setChat(id, chat);
            conn.chats[id] = chat;

            manager.emit("group:participants-updated", { id, participants, action });
        },

        "blocklist.set": async ({ blocklist }) => {
            await manager.blocklistCache.clear();
            for (const jid of blocklist) {
                await manager.blocklistCache.add(jid);
            }
            manager.emit("blocklist:set", blocklist);
        },

        "blocklist.update": async ({ blocklist, type }) => {
            for (const jid of blocklist) {
                if (type === "add") {
                    await manager.blocklistCache.add(jid);
                } else {
                    await manager.blocklistCache.delete(jid);
                }
            }
            manager.emit("blocklist:updated", { blocklist, type });
        },

        call: async (calls) => {
            const callArray = Array.isArray(calls) ? calls : [calls];
            for (const call of callArray) {
                manager.emit("call:received", call);
            }
        },

        "presence.update": async ({ id, presences }) => {
            if (!id || !presences) return;

            const sender = Object.keys(presences)[0] || id;
            const _sender = conn.decodeJid(sender);
            const presenceData = presences[sender];

            if (!presenceData) return;

            const presence = presenceData.lastKnownPresence || "composing";
            const existing = (await manager.getChat(_sender)) || { id: _sender };
            const chat = { ...existing, presences: presence };

            await manager.setChat(_sender, chat);
            conn.chats[_sender] = chat;

            if (isGroup(id)) {
                const existingGroup = (await manager.getChat(id)) || { id };
                const groupChat = { ...existingGroup, isChats: true };
                await manager.setChat(id, groupChat);
                conn.chats[id] = groupChat;
            }

            manager.emit("presence:updated", { id, sender: _sender, presence });
        },
    };
}

export default function bind(conn) {
    if (!("chats" in conn)) conn.chats = {};

    const manager = new StoreManager();
    const handlers = createEventHandlers(conn, manager);

    for (const [event, handler] of Object.entries(handlers)) {
        conn.ev.on(event, handler);
    }

    const syncInterval = setInterval(() => {
        manager.syncToChats(conn).catch((err) => {
            global.logger.error({ err }, "Sync interval error");
        });
    }, 300000);

    if (!("_storeManager" in conn)) conn._storeManager = manager;
    if (!("loadMessage" in conn))
        conn.loadMessage = async (jid, id) => (await manager.getMessage(id)) || null;
    if (!("getStoreStats" in conn)) conn.getStoreStats = () => manager.getStats();

    conn.cleanupStore = async () => {
        clearInterval(syncInterval);

        for (const [event, handler] of Object.entries(handlers)) {
            conn.ev.off(event, handler);
        }

        await manager.destroy();
    };
    return conn;
}
