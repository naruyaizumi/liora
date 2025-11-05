/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import pino from "pino";
import ColdStore from "./cold-store.js";
import HotStore from "./hot-store.js";

const logger = pino({
    level: "info",
    base: { module: "STORE" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const DEFAULT_CONFIG = {
    maxMessagesPerChat: 100,
    messageCleanupThreshold: 150,
    cacheTTL: 3600,
    metadataTTL: 300,
    flushInterval: 5000,
    batchSize: 50,
};

let isGlobalShutdownInitiated = false;
let globalShutdownHandlersRegistered = false;

function safeDecodeJid(conn, jid) {
    try {
        if (!jid || typeof jid !== "string") return null;

        const decoded = conn.decodeJid(jid);

        if (!decoded || decoded === "status@broadcast" || decoded.startsWith("broadcast")) {
            return null;
        }

        return decoded;
    } catch (e) {
        logger.warn(e.message);
        return null;
    }
}

function bind(conn, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    const coldStore = new ColdStore();
    const hotStore = new HotStore(coldStore, finalConfig);

    const intervals = [];

    conn.chats = hotStore.chats;

    conn.ev.on("contacts.upsert", (contacts) => {
        try {
            if (!Array.isArray(contacts)) contacts = [contacts];

            for (const contact of contacts) {
                if (!contact?.id) continue;

                const jid = safeDecodeJid(conn, contact.id);
                if (!jid) continue;

                const isGroup = jid.endsWith("@g.us");
                const existing = hotStore.getChat(jid) || { id: jid, messages: {} };

                const chatData = isGroup
                    ? {
                          ...existing,
                          ...contact,
                          id: jid,
                          isGroup: true,
                          subject: contact.subject || contact.name || existing.subject || "",
                      }
                    : {
                          ...existing,
                          ...contact,
                          id: jid,
                          isGroup: false,
                          name: contact.notify || contact.name || existing.name || "",
                      };

                hotStore.upsertChat(jid, chatData);
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on("contacts.set", ({ contacts }) => {
        try {
            if (!Array.isArray(contacts)) return;

            for (const contact of contacts) {
                if (!contact?.id) continue;

                const jid = safeDecodeJid(conn, contact.id);
                if (!jid) continue;

                const isGroup = jid.endsWith("@g.us");
                const existing = hotStore.getChat(jid) || { id: jid, messages: {} };

                const chatData = isGroup
                    ? {
                          ...existing,
                          ...contact,
                          id: jid,
                          isGroup: true,
                          subject: contact.subject || contact.name || existing.subject || "",
                      }
                    : {
                          ...existing,
                          ...contact,
                          id: jid,
                          isGroup: false,
                          name: contact.notify || contact.name || existing.name || "",
                      };

                hotStore.upsertChat(jid, chatData);
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on("chats.set", async ({ chats }) => {
        try {
            for (const chat of chats) {
                if (!chat?.id) continue;

                const jid = safeDecodeJid(conn, chat.id);
                if (!jid) continue;

                const existing = hotStore.getChat(jid) || {
                    id: jid,
                    messages: {},
                };
                let chatData = {
                    ...existing,
                    ...chat,
                    isChats: true,
                    isGroup: jid.endsWith("@g.us"),
                };

                if (chatData.isGroup) {
                    try {
                        const metadata = await hotStore.getCachedMetadata(jid, () =>
                            conn.groupMetadata(jid)
                        );
                        if (metadata) {
                            chatData.metadata = metadata;
                            chatData.subject = chatData.subject || metadata.subject || "";
                        }
                    } catch (e) {
                        logger.warn(e.message);
                    }
                }

                hotStore.upsertChat(jid, chatData);
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on("chats.upsert", (chats) => {
        try {
            if (!Array.isArray(chats)) chats = [chats];

            for (const chat of chats) {
                if (!chat?.id) continue;

                const jid = safeDecodeJid(conn, chat.id);
                if (!jid) continue;

                const existing = hotStore.getChat(jid) || { id: jid, messages: {} };
                const chatData = {
                    ...existing,
                    ...chat,
                    isChats: true,
                    isGroup: jid.endsWith("@g.us"),
                };

                hotStore.upsertChat(jid, chatData);
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on("chats.update", (updates) => {
        try {
            if (!Array.isArray(updates)) updates = [updates];

            for (const update of updates) {
                if (!update?.id) continue;

                const jid = safeDecodeJid(conn, update.id);
                if (!jid) continue;

                const existing = hotStore.getChat(jid);
                if (!existing) continue;

                const chatData = { ...existing, ...update };
                hotStore.upsertChat(jid, chatData);
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on("presence.update", ({ id, presences }) => {
        try {
            const sender = Object.keys(presences || {})[0] || id;
            const jid = safeDecodeJid(conn, sender);

            if (!jid) return;

            const existing = hotStore.getChat(jid) || { id: jid, messages: {} };
            const chatData = {
                ...existing,
                presences: presences[sender]?.lastKnownPresence || "available",
            };

            hotStore.upsertChat(jid, chatData);
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on(
        "group-participants.update",
        async ({ id, participants: _participants, action: _action }) => {
            try {
                const jid = safeDecodeJid(conn, id);
                if (!jid) return;

                hotStore.invalidateMetadata(jid);

                try {
                    const metadata = await hotStore.getCachedMetadata(jid, () =>
                        conn.groupMetadata(jid)
                    );

                    const existing = hotStore.getChat(jid) || {
                        id: jid,
                        messages: {},
                    };
                    const chatData = {
                        ...existing,
                        metadata,
                        subject: metadata?.subject || existing.subject,
                    };

                    hotStore.upsertChat(jid, chatData);
                } catch (e) {
                    logger.warn(e.message);
                }
            } catch (e) {
                logger.error(e.message);
            }
        }
    );

    conn.ev.on("groups.update", async (updates) => {
        try {
            if (!Array.isArray(updates)) updates = [updates];

            for (const update of updates) {
                const jid = safeDecodeJid(conn, update?.id);
                if (!jid) continue;

                hotStore.invalidateMetadata(jid);

                try {
                    const metadata = await hotStore.getCachedMetadata(jid, () =>
                        conn.groupMetadata(jid)
                    );

                    const existing = hotStore.getChat(jid) || {
                        id: jid,
                        messages: {},
                    };
                    const chatData = {
                        ...existing,
                        metadata,
                        subject: update.subject || metadata?.subject || existing.subject,
                    };

                    hotStore.upsertChat(jid, chatData);
                } catch (e) {
                    logger.warn(e.message);
                }
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on("messages.upsert", ({ messages, type: _type }) => {
        try {
            if (!Array.isArray(messages)) messages = [messages];

            for (const msg of messages) {
                if (msg.messageStubType) continue;

                const jid = safeDecodeJid(conn, msg?.key?.remoteJid);
                if (!jid) continue;

                hotStore.upsertMessage(msg);
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    conn.ev.on("messages.update", (updates) => {
        try {
            if (!Array.isArray(updates)) updates = [updates];

            for (const { key, update } of updates) {
                const jid = safeDecodeJid(conn, key?.remoteJid);
                if (!jid) continue;

                hotStore.updateMessage(key, update);
            }
        } catch (e) {
            logger.error(e.message);
        }
    });

    let isShuttingDown = false;

    async function gracefulShutdown(_signal) {
        if (isShuttingDown || isGlobalShutdownInitiated) {
            return;
        }
        isShuttingDown = true;
        isGlobalShutdownInitiated = true;

        try {
            intervals.forEach((interval) => clearInterval(interval));
            intervals.length = 0;

            await hotStore.flush();

            await hotStore.dispose();
            await coldStore.close();
        } catch (e) {
            logger.error(e.message);
        }
    }

    if (!globalShutdownHandlersRegistered) {
        globalShutdownHandlersRegistered = true;

        process.once("SIGINT", () => gracefulShutdown("SIGINT"));
        process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.once("beforeExit", () => gracefulShutdown("beforeExit"));
    }

    if (process.env.LOG_STATS === "true") {
        const statsInterval = setInterval(() => {
            try {
                hotStore.getStats();
                coldStore.getStats();
            } catch (e) {
                logger.error(e.message);
            }
        }, 60000);
        intervals.push(statsInterval);
    }

    const vacuumInterval = setInterval(() => {
        coldStore.vacuum().catch((e) => {
            logger.error(e.message);
        });
    }, 3600000);
    intervals.push(vacuumInterval);

    return {
        hot: hotStore,
        cold: coldStore,
        flush: () => hotStore.flush(),
        dispose: gracefulShutdown,
    };
}

export default { bind };
