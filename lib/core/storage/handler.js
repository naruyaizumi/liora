import { logger, isGroup, isStatus } from "./utils.js";

export function createEventHandlers(conn, manager) {
    const handlers = {
        "connection.update": async (update) => {
            try {
                const { connection, lastDisconnect } = update;

                if (connection === "close") {
                    logger.warn({ lastDisconnect }, "Connection closed");
                    manager.emit("connection:close", update);
                } else if (connection === "open") {
                    logger.info("Connection opened");
                    manager.emit("connection:open", update);
                }
            } catch (err) {
                logger.error({ err }, "connection.update error");
            }
        },

        "messaging-history.set": async ({ chats, contacts, messages, isLatest }) => {
            try {
                const startTime = Date.now();

                if (contacts?.length) {
                    let processed = 0;
                    for (const contact of contacts) {
                        if (!contact?.id || isStatus(contact.id)) continue;

                        const id = conn.decodeJid(contact.id);
                        if (manager.setContact(id, contact)) {
                            processed++;
                        }
                    }
                    logger.debug({ processed, total: contacts.length }, "Contacts synced");
                }

                const groupsToFetch = [];
                if (chats?.length) {
                    let processed = 0;
                    for (const chat of chats) {
                        if (!chat?.id || isStatus(chat.id)) continue;

                        const id = conn.decodeJid(chat.id);
                        const chatData = { ...chat, isChats: true };

                        if (manager.setChat(id, chatData)) {
                            conn.chats[id] = chatData;
                            processed++;

                            if (isGroup(id)) {
                                groupsToFetch.push(id);
                            }
                        }
                    }
                    logger.debug({ processed, total: chats.length }, "Chats synced");
                }

                if (groupsToFetch.length > 0) {
                    await manager.batchFetchGroupMetadata(conn, groupsToFetch, {
                        batchSize: 5,
                        delay: 1000,
                    });
                }

                if (messages?.length) {
                    let processed = 0;
                    for (const msg of messages) {
                        if (!msg?.message) continue;

                        const msgId = msg.key?.id;
                        if (msgId && manager.setMessage(msgId, msg)) {
                            processed++;
                        }
                    }
                    logger.debug({ processed, total: messages.length }, "Messages synced");
                }

                const duration = Date.now() - startTime;
                logger.info(
                    {
                        chats: chats?.length || 0,
                        contacts: contacts?.length || 0,
                        messages: messages?.length || 0,
                        groups: groupsToFetch.length,
                        isLatest,
                        duration,
                    },
                    "History sync completed"
                );

                manager.emit("history:set", { chats, contacts, messages, isLatest });
            } catch (err) {
                manager.metrics.lastError = err;
                logger.error({ err }, "messaging-history.set error");
            }
        },

        "messages.upsert": async ({ messages, type }) => {
            try {
                manager.metrics.operations.messageUpsert++;

                for (const msg of messages) {
                    if (!msg?.message) continue;

                    const remoteJid = msg.key?.remoteJid;
                    if (isStatus(remoteJid)) continue;

                    const msgId = msg.key?.id || `${remoteJid}-${Date.now()}`;
                    manager.setMessage(msgId, msg);

                    if (remoteJid) {
                        const chat = manager.getChat(remoteJid) || { id: remoteJid };
                        chat.conversationTimestamp = msg.messageTimestamp;

                        if (type === "notify") {
                            chat.unreadCount = (chat.unreadCount || 0) + 1;
                        }

                        manager.setChat(remoteJid, chat);
                        conn.chats[remoteJid] = chat;
                    }
                }

                logger.debug({ count: messages.length, type }, "Messages upserted");
            } catch (err) {
                manager.metrics.lastError = err;
                logger.error({ err }, "messages.upsert error");
            }
        },

        "messages.update": async (updates) => {
            try {
                const updatesArray = Array.isArray(updates) ? updates : [updates];

                for (const update of updatesArray) {
                    const msgId = update.key?.id;
                    if (!msgId) continue;

                    const existing = manager.getMessage(msgId);
                    if (existing) {
                        const updated = { ...existing, ...update };
                        manager.setMessage(msgId, updated);
                    }
                }

                logger.debug({ count: updatesArray.length }, "Messages updated");
            } catch (err) {
                logger.error({ err }, "messages.update error");
            }
        },

        "messages.delete": async (deletion) => {
            try {
                if (deletion.keys) {
                    for (const key of deletion.keys) {
                        const msgId = key.id;
                        if (msgId) {
                            manager.messageCache.delete(msgId);
                        }
                    }
                }
                logger.debug({ deletion }, "Messages deleted");
            } catch (err) {
                logger.error({ err }, "messages.delete error");
            }
        },

        "message-receipt.update": async (updates) => {
            try {
                const updatesArray = Array.isArray(updates) ? updates : [updates];

                for (const update of updatesArray) {
                    const msgId = update.key?.id;
                    if (!msgId) continue;

                    const existing = manager.getMessage(msgId);
                    if (existing) {
                        existing.status = update.receipt?.receiptTimestamp || existing.status;
                        manager.setMessage(msgId, existing);
                    }
                }

                logger.debug({ count: updatesArray.length }, "Message receipts updated");
            } catch (err) {
                logger.error({ err }, "message-receipt.update error");
            }
        },

        "chats.upsert": async (chatsUpsert) => {
            try {
                manager.metrics.operations.chatUpsert++;
                const chatsArray = Array.isArray(chatsUpsert) ? chatsUpsert : [chatsUpsert];

                for (const chatData of chatsArray) {
                    if (!chatData?.id || isStatus(chatData.id)) continue;

                    const id = conn.decodeJid(chatData.id);
                    const chat = { ...chatData, isChats: true };

                    manager.setChat(id, chat);
                    conn.chats[id] = chat;

                    if (isGroup(id) && !manager.getGroupMeta(id)) {
                        manager.fetchGroupMetadata(conn, id).catch((err) => {
                            logger.debug(
                                { err, id },
                                "Failed to fetch group metadata on chat upsert"
                            );
                        });
                    }
                }

                logger.debug({ count: chatsArray.length }, "Chats upserted");
            } catch (err) {
                manager.metrics.lastError = err;
                logger.error({ err }, "chats.upsert error");
            }
        },

        "chats.update": async (chatsUpdate) => {
            try {
                manager.metrics.operations.chatUpdate++;
                const updates = Array.isArray(chatsUpdate) ? chatsUpdate : [chatsUpdate];

                for (const update of updates) {
                    if (!update?.id) continue;

                    const id = conn.decodeJid(update.id);
                    if (isStatus(id)) continue;

                    const existing = manager.getChat(id) || { id };
                    const chat = { ...existing, ...update };

                    manager.setChat(id, chat);
                    conn.chats[id] = chat;
                }

                logger.debug({ count: updates.length }, "Chats updated");
            } catch (err) {
                manager.metrics.lastError = err;
                logger.error({ err }, "chats.update error");
            }
        },

        "chats.delete": async (deletions) => {
            try {
                manager.metrics.operations.chatDelete++;
                const ids = Array.isArray(deletions) ? deletions : [deletions];

                for (const id of ids) {
                    if (isStatus(id)) continue;

                    manager.deleteChat(id);
                    delete conn.chats[id];
                }

                logger.debug({ count: ids.length }, "Chats deleted");
            } catch (err) {
                manager.metrics.lastError = err;
                logger.error({ err }, "chats.delete error");
            }
        },

        "contacts.upsert": async (contacts) => {
            try {
                manager.metrics.operations.contactUpsert++;
                const contactArray = Array.isArray(contacts) ? contacts : [contacts];

                for (const contact of contactArray) {
                    if (!contact?.id) continue;

                    const id = conn.decodeJid(contact.id);
                    if (isStatus(id)) continue;

                    manager.setContact(id, contact);

                    const chat = manager.getChat(id);
                    if (chat) {
                        if (isGroup(id)) {
                            chat.subject = contact.subject || chat.subject;
                        } else {
                            chat.name = contact.notify || contact.name || chat.name;
                        }
                        manager.setChat(id, chat);
                        conn.chats[id] = chat;
                    }
                }

                logger.debug({ count: contactArray.length }, "Contacts upserted");
            } catch (err) {
                manager.metrics.lastError = err;
                logger.error({ err }, "contacts.upsert error");
            }
        },

        "contacts.update": async (updates) => {
            try {
                const updatesArray = Array.isArray(updates) ? updates : [updates];

                for (const update of updatesArray) {
                    if (!update?.id) continue;

                    const id = conn.decodeJid(update.id);
                    if (isStatus(id)) continue;

                    const existing = manager.getContact(id);
                    if (existing) {
                        const merged = { ...existing, ...update };
                        manager.setContact(id, merged);
                    }
                }

                logger.debug({ count: updatesArray.length }, "Contacts updated");
            } catch (err) {
                logger.error({ err }, "contacts.update error");
            }
        },

        "groups.upsert": async (groups) => {
            try {
                const groupsArray = Array.isArray(groups) ? groups : [groups];

                for (const group of groupsArray) {
                    if (!group?.id || !isGroup(group.id)) continue;

                    const id = conn.decodeJid(group.id);

                    await manager.fetchGroupMetadata(conn, id, true);
                }

                logger.debug({ count: groupsArray.length }, "Groups upserted");
            } catch (err) {
                logger.error({ err }, "groups.upsert error");
            }
        },

        "groups.update": async (groupsUpdates) => {
            try {
                manager.metrics.operations.groupUpdate++;
                const updatesArray = Array.isArray(groupsUpdates) ? groupsUpdates : [groupsUpdates];

                for (const update of updatesArray) {
                    if (!update?.id) continue;

                    const id = conn.decodeJid(update.id);
                    if (isStatus(id) || !isGroup(id)) continue;

                    const metadata = await manager.fetchGroupMetadata(conn, id, true);

                    if (metadata) {
                        const chat = manager.getChat(id) || { id };
                        chat.subject = update.subject || metadata.subject;
                        chat.metadata = metadata;

                        manager.setChat(id, chat);
                        conn.chats[id] = chat;
                    }
                }

                logger.debug({ count: updatesArray.length }, "Groups updated");
            } catch (err) {
                manager.metrics.lastError = err;
                logger.error({ err }, "groups.update error");
            }
        },

        "group-participants.update": async ({ id, participants, action }) => {
            try {
                if (!id || isStatus(id)) return;

                id = conn.decodeJid(id);

                await manager.fetchGroupMetadata(conn, id, true);

                logger.debug(
                    { id, participants: participants?.length, action },
                    "Group participants updated"
                );
            } catch (err) {
                logger.error({ err }, "group-participants.update error");
            }
        },

        "presence.update": async ({ id, presences }) => {
            try {
                if (!id || isStatus(id)) return;

                id = conn.decodeJid(id);

                if (presences) {
                    for (const [participantId, presence] of Object.entries(presences)) {
                        const jid = conn.decodeJid(participantId);
                        manager.setPresence(jid, presence);
                    }
                }

                logger.trace(
                    { id, count: Object.keys(presences || {}).length },
                    "Presence updated"
                );
            } catch (err) {
                logger.error({ err }, "presence.update error");
            }
        },

        "blocklist.set": async ({ blocklist }) => {
            try {
                if (Array.isArray(blocklist)) {
                    logger.debug({ count: blocklist.length }, "Blocklist updated");
                    manager.emit("blocklist:update", { blocklist });
                }
            } catch (err) {
                logger.error({ err }, "blocklist.set error");
            }
        },

        "blocklist.update": async ({ blocklist, type }) => {
            try {
                logger.debug({ count: blocklist?.length, type }, "Blocklist changed");
                manager.emit("blocklist:update", { blocklist, type });
            } catch (err) {
                logger.error({ err }, "blocklist.update error");
            }
        },

        call: async (calls) => {
            try {
                const callsArray = Array.isArray(calls) ? calls : [calls];

                for (const call of callsArray) {
                    logger.debug(
                        {
                            from: call.from,
                            status: call.status,
                            isVideo: call.isVideo,
                            isGroup: call.isGroup,
                        },
                        "Call received"
                    );

                    manager.emit("call", call);
                }
            } catch (err) {
                logger.error({ err }, "call error");
            }
        },

        "labels.edit": async (label) => {
            try {
                logger.debug({ label }, "Label edited");
                manager.emit("label:edit", label);
            } catch (err) {
                logger.error({ err }, "labels.edit error");
            }
        },

        "labels.association": async ({ association }) => {
            try {
                logger.debug({ association }, "Label association changed");
                manager.emit("label:association", association);
            } catch (err) {
                logger.error({ err }, "labels.association error");
            }
        },
    };

    return handlers;
}
