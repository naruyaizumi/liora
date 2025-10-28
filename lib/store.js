/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import Database from "better-sqlite3";
import { BufferJSON } from "baileys";
import pino from "pino";

const logger = pino({
    level: "debug",
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

const SYM_BOUND = Symbol.for("liora.store.bound");
const SYM_HANDLERS = Symbol.for("liora.store.handlers");
const SYM_SQL = Symbol.for("liora.store.db");
const SYM_PS = Symbol.for("liora.store.prepared");
const SYM_TIMERS = Symbol.for("liora.store.timers");
const SYM_CLEANUP = Symbol.for("liora.store.cleanup");
const GROUP_MD_TTL_MS = 60000;
const MAX_MSGS_PER_CHAT = 40;
const KEEP_RATIO = 0.75;
const FLUSH_MS = 40;
const FLUSH_MAX = 256;
const FLUSH_COOLDOWN_MS = 80;
const MSG_TTL_MS = Number(process.env.LIORA_MSG_TTL_MS || 0);
const CACHE_CLEANUP_INTERVAL_MS = 300000;
const MAX_FLUSH_RETRIES = 3;

const isStatusJid = (id) => !id || id === "status@broadcast";
const isGroupJid = (id = "") => id.endsWith("@g.us");

const J = {
    s: (o) => JSON.stringify(o, BufferJSON.replacer),
    p: (s) => JSON.parse(s, BufferJSON.reviver),
};

function assignIf(obj, key, val) {
    if (val == null) return;
    if (obj[key] !== val) obj[key] = val;
}

function ensureChat(conn, jid) {
    if (!conn.chats) conn.chats = Object.create(null);
    return (conn.chats[jid] ||= { id: jid });
}

function maybeTrimMessages(chat) {
    const msgs = chat?.messages;
    if (!msgs) return;
    const keys = Object.keys(msgs);
    const n = keys.length;
    if (n <= MAX_MSGS_PER_CHAT) return;
    const keep = Math.max(1, Math.floor(MAX_MSGS_PER_CHAT * KEEP_RATIO));
    const slice = keys.slice(n - keep);
    const next = Object.create(null);
    for (const k of slice) next[k] = msgs[k];
    chat.messages = next;
}

function ensureGroupCache(conn) {
    if (!conn._groupCache) {
        Object.defineProperty(conn, "_groupCache", {
            value: { data: new Map(), inflight: new Map() },
            enumerable: false,
            configurable: false,
            writable: false,
        });
    }
}

function cleanupGroupCache(conn) {
    ensureGroupCache(conn);
    const now = Date.now();
    const cache = conn._groupCache;

    for (const [jid, entry] of cache.data.entries()) {
        if (entry.exp < now) {
            cache.data.delete(jid);
        }
    }
}

function openDB() {
    const filename = "file:naruyaizumi:?mode=memory&cache=shared";
    if (!global.__storeDB) {
        global.__storeDB = new Database(filename, { timeout: 10000, fileMustExist: false });
    }
    const db = global.__storeDB;
    if (!db.__liora_init) {
        try {
            db.pragma("journal_mode = MEMORY");
        } catch (e) {
            logger.debug(e.message);
        }
        try {
            db.pragma("synchronous = OFF");
        } catch (e) {
            logger.debug(e.message);
        }
        try {
            db.pragma("temp_store = MEMORY");
        } catch (e) {
            logger.debug(e.message);
        }
        try {
            db.pragma("locking_mode = NORMAL");
        } catch (e) {
            logger.debug(e.message);
        }
        try {
            db.pragma("cache_spill = OFF");
        } catch (e) {
            logger.debug(e.message);
        }
        try {
            db.pragma("foreign_keys = OFF");
        } catch (e) {
            logger.debug(e.message);
        }
        try {
            db.pragma("cache_size = -65536");
        } catch (e) {
            logger.debug(e.message);
        }
        try {
            db.pragma("busy_timeout = 10000");
        } catch (e) {
            logger.debug(e.message);
        }

        db.exec(`
        CREATE TABLE IF NOT EXISTS meta     (key TEXT PRIMARY KEY, val TEXT NOT NULL) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS chats    (id  TEXT PRIMARY KEY, data TEXT NOT NULL) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS contacts (id  TEXT PRIMARY KEY, data TEXT NOT NULL) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS groups   (id  TEXT PRIMARY KEY, data TEXT NOT NULL) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS messages (
          jid  TEXT NOT NULL,
          id   TEXT NOT NULL,
          ts   INTEGER,
          json TEXT NOT NULL,
          PRIMARY KEY (jid, id)
        );
        CREATE INDEX IF NOT EXISTS idx_messages_jid_ts ON messages (jid, ts);
      `);

        db.exec(`
        CREATE TRIGGER IF NOT EXISTS messages_cap AFTER INSERT ON messages
        BEGIN
          DELETE FROM messages
           WHERE jid = NEW.jid
             AND rowid NOT IN (
               SELECT rowid FROM messages
                WHERE jid = NEW.jid
                ORDER BY ts DESC, rowid DESC
                LIMIT ${MAX_MSGS_PER_CHAT}
             );
        END;
      `);

        if (MSG_TTL_MS > 0) {
            db.exec(`
          CREATE TRIGGER IF NOT EXISTS messages_ttl AFTER INSERT ON messages
          BEGIN
            DELETE FROM messages
              WHERE ts > 0 AND ts < (CAST((strftime('%s','now')*1000) AS INTEGER) - ${MSG_TTL_MS});
          END;
        `);
        }

        const ps = {
            metaGet: db.prepare("SELECT val FROM meta WHERE key=?"),
            metaSet: db.prepare(
                "INSERT INTO meta(key,val) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val"
            ),
            chatUp: db.prepare("INSERT OR REPLACE INTO chats(id,data) VALUES(?,?)"),
            chatAll: db.prepare("SELECT id,data FROM chats"),
            chatGet: db.prepare("SELECT data FROM chats WHERE id=?"),
            contactUp: db.prepare("INSERT OR REPLACE INTO contacts(id,data) VALUES(?,?)"),
            contactAll: db.prepare("SELECT id,data FROM contacts"),
            groupUp: db.prepare("INSERT OR REPLACE INTO groups(id,data) VALUES(?,?)"),
            groupAll: db.prepare("SELECT id,data FROM groups"),
            groupGet: db.prepare("SELECT data FROM groups WHERE id=?"),
            msgUp: db.prepare("INSERT OR REPLACE INTO messages(jid,id,ts,json) VALUES(?,?,?,?)"),
            msgGet: db.prepare("SELECT json FROM messages WHERE jid=? AND id=?"),
            msgGetAll: db.prepare(
                "SELECT id,json FROM messages WHERE jid=? ORDER BY ts DESC LIMIT ?"
            ),
            msgDelJid: db.prepare("DELETE FROM messages WHERE jid=?"),
            msgDel: db.prepare("DELETE FROM messages WHERE jid=? AND id=?"),
        };

        let ver = Number(ps.metaGet.get("schema_version")?.val || 1);
        const migrateTo = (target) => {
            if (ver >= target) return;
            db.transaction(() => {
                switch (target) {
                    case 2:
                        break;
                    default:
                        break;
                }
                ver = target;
                ps.metaSet.run("schema_version", String(ver));
            })();
        };
        migrateTo(1);

        db.ps = ps;
        db.__liora_init = true;
    }

    return { db, ps: db.ps };
}

async function getGroupMetadataCached(conn, jid) {
    ensureGroupCache(conn);
    const now = Date.now();
    const cache = conn._groupCache;
    const hit = cache.data.get(jid);
    if (hit && hit.exp > now && hit.value) return hit.value;

    const inflightPromise = cache.inflight.get(jid);
    if (inflightPromise) {
        try {
            return await inflightPromise;
        } catch (e) {
            logger.debug(e.message);
        }
    }

    const p = (async () => {
        try {
            const md = await conn.groupMetadata(jid).catch((err) => {
                logger.debug(e.message);
                return null;
            });
            cache.data.set(jid, { exp: now + GROUP_MD_TTL_MS, value: md || null });
            cache.inflight.delete(jid);
            return md || null;
        } catch (e) {
            cache.data.set(jid, { exp: now + GROUP_MD_TTL_MS / 2, value: null });
            cache.inflight.delete(jid);
            throw err;
        }
    })();

    cache.inflight.set(jid, p);
    return p;
}

function invalidateGroupCache(conn, jid) {
    ensureGroupCache(conn);
    const cache = conn._groupCache;
    cache.data.delete(jid);
    cache.inflight.delete(jid);
}

function loadDataFromDB(conn, ps) {
    try {
        const chats = ps.chatAll.all();
        for (const row of chats) {
            try {
                const data = JSON.parse(row.data);
                const chat = ensureChat(conn, row.id);
                Object.assign(chat, data);
            } catch (e) {
                logger.debug(e.message);
            }
        }

        const contacts = ps.contactAll.all();
        for (const row of contacts) {
            try {
                const data = JSON.parse(row.data);
                const chat = ensureChat(conn, row.id);
                if (data.name) chat.name = data.name;
                if (data.imgUrl) chat.imgUrl = data.imgUrl;
            } catch (e) {
                logger.debug(e.message);
            }
        }

        const groups = ps.groupAll.all();
        for (const row of groups) {
            try {
                const data = J.p(row.data);
                const chat = ensureChat(conn, row.id);
                chat.metadata = data;
                if (data.subject) chat.subject = data.subject;
            } catch (e) {
                logger.debug(e.message);
            }
        }

        for (const jid in conn.chats) {
            try {
                const msgs = ps.msgGetAll.all(jid, MAX_MSGS_PER_CHAT);
                if (msgs.length) {
                    if (!conn.chats[jid].messages) {
                        conn.chats[jid].messages = Object.create(null);
                    }
                    for (const row of msgs) {
                        try {
                            const msg = J.p(row.json);
                            conn.chats[jid].messages[row.id] = msg;
                        } catch (e) {
                            logger.debug(e.message);
                        }
                    }
                }
            } catch (e) {
                logger.debug(e.message);
            }
        }
    } catch (e) {
        logger.error(e);
    }
}

function extractTimestamp(msg) {
    const ts = msg?.messageTimestamp;
    if (!ts) return Date.now();

    if (typeof ts === "bigint") {
        const num = Number(ts);
        return num > 9999999999 ? num : num * 1000;
    }

    if (typeof ts === "number") {
        return ts > 9999999999 ? ts : ts * 1000;
    }

    if (typeof ts === "string") {
        const num = Number(ts);
        if (isNaN(num)) return Date.now();
        return num > 9999999999 ? num : num * 1000;
    }

    return Date.now();
}

function buildHandlers(conn, dirty) {
    const { ps } = conn[SYM_PS];
    const { markChat, markContact, markGroup, markMsg, markMsgDel } = dirty;
    const h = Object.create(null);

    h.updateContacts = function (payload) {
        const list = payload?.contacts || payload || [];
        if (!Array.isArray(list)) return;

        for (const contact of list) {
            const id = contact?.id;
            if (!id || isStatusJid(id)) continue;
            const chat = ensureChat(conn, id);
            if (isGroupJid(id))
                assignIf(chat, "subject", contact.subject || contact.name || chat.subject || "");
            else
                assignIf(
                    chat,
                    "name",
                    contact.notify || contact.name || chat.name || chat.notify || ""
                );

            for (const [k, v] of Object.entries(contact)) {
                if (k === "id") continue;
                if (v != null) chat[k] = v;
            }
            maybeTrimMessages(chat);
            markContact(id);
            markChat(id);
        }
    };

    h.onChatsSet = async function ({ chats }) {
        if (!Array.isArray(chats)) return;

        for (let { id, name, readOnly } of chats) {
            if (!id || isStatusJid(id)) continue;
            const chat = ensureChat(conn, id);
            chat.isChats = !readOnly;
            if (name) {
                if (isGroupJid(id)) assignIf(chat, "subject", name);
                else assignIf(chat, "name", name);
            }
            if (isGroupJid(id)) {
                try {
                    const md = await getGroupMetadataCached(conn, id);
                    if (md) {
                        assignIf(chat, "subject", chat.subject || md.subject);
                        chat.metadata = md;
                        markGroup(id);
                    }
                } catch (e) {
                    logger.debug(e.message);
                }
            }
            maybeTrimMessages(chat);
            markChat(id);
        }
    };

    h.onChatsUpdate = function (updates) {
        if (!Array.isArray(updates)) return;

        for (const update of updates) {
            const id = update?.id;
            if (!id || isStatusJid(id)) continue;
            const chat = ensureChat(conn, id);

            for (const [key, value] of Object.entries(update)) {
                if (key === "id") continue;
                if (value != null) {
                    chat[key] = value;
                }
            }

            maybeTrimMessages(chat);
            markChat(id);
        }
    };

    h.onGroupParticipantsUpdate = async function ({ id }) {
        if (!id || isStatusJid(id) || !isGroupJid(id)) return;
        const chat = ensureChat(conn, id);
        chat.isChats = true;

        invalidateGroupCache(conn, id);

        try {
            const md = await getGroupMetadataCached(conn, id);
            if (md) {
                assignIf(chat, "subject", md.subject);
                chat.metadata = md;
                markGroup(id);
            }
        } catch (e) {
            logger.debug(e.message);
        }

        maybeTrimMessages(chat);
        markChat(id);
    };

    h.onGroupsUpdate = async function (updates) {
        if (!Array.isArray(updates)) return;

        for (const upd of updates) {
            const id = upd?.id;
            if (!id || isStatusJid(id) || !isGroupJid(id)) continue;
            const chat = ensureChat(conn, id);
            chat.isChats = true;

            invalidateGroupCache(conn, id);

            try {
                const md = await getGroupMetadataCached(conn, id);
                if (md) {
                    chat.metadata = md;
                    assignIf(chat, "subject", upd.subject || md.subject);
                    markGroup(id);
                }
            } catch (e) {
                logger.debug(e.message);
            }

            maybeTrimMessages(chat);
            markChat(id);
        }
    };

    h.onChatsUpsert = function (chatsUpsert) {
        const id = chatsUpsert?.id;
        if (!id || isStatusJid(id)) return;
        const prev = conn.chats?.[id] || {};
        conn.chats[id] = { ...prev, ...chatsUpsert, isChats: true };
        maybeTrimMessages(conn.chats[id]);
        markChat(id);
    };

    h.onPresenceUpdate = function ({ id, presences }) {
        const sender = (presences && Object.keys(presences)[0]) || id;
        if (!sender) return;
        const presence = presences?.[sender]?.lastKnownPresence || "composing";
        const chat = ensureChat(conn, sender);
        assignIf(chat, "presences", presence);
        if (isGroupJid(id || "")) ensureChat(conn, id);
        maybeTrimMessages(chat);
        markChat(sender);
    };

    h.onMessagesUpsert = function ({ messages, type }) {
        if (!Array.isArray(messages)) return;

        for (const msg of messages) {
            const jid = msg?.key?.remoteJid;
            const id = msg?.key?.id;
            if (!jid || !id || isStatusJid(jid)) continue;

            const chat = ensureChat(conn, jid);
            if (!chat.messages) chat.messages = Object.create(null);

            chat.messages[id] = msg;

            const ts = extractTimestamp(msg);

            maybeTrimMessages(chat);
            markMsg(jid, id, ts, J.s(msg));
            markChat(jid);
        }
    };

    h.onMessagesUpdate = function (updates) {
        if (!Array.isArray(updates)) return;

        for (const update of updates) {
            const jid = update?.key?.remoteJid;
            const id = update?.key?.id;
            if (!jid || !id || isStatusJid(jid)) continue;

            const chat = ensureChat(conn, jid);
            if (!chat.messages) chat.messages = Object.create(null);

            const existingMsg = chat.messages[id];
            if (existingMsg) {
                Object.assign(existingMsg, update.update);
                const ts = extractTimestamp(existingMsg);
                markMsg(jid, id, ts, J.s(existingMsg));
            } else {
                chat.messages[id] = { key: update.key, ...update.update };
                const ts = extractTimestamp(update);
                markMsg(jid, id, ts, J.s(chat.messages[id]));
            }

            maybeTrimMessages(chat);
            markChat(jid);
        }
    };

    h.onMessagesDelete = function (deletion) {
        const jid = deletion?.keys?.[0]?.remoteJid || deletion?.jid;
        if (!jid || isStatusJid(jid)) return;

        const chat = conn.chats?.[jid];
        if (!chat || !chat.messages) return;

        if (deletion.all) {
            chat.messages = Object.create(null);
            markMsgDel(jid, null);
        } else if (deletion.keys && Array.isArray(deletion.keys)) {
            for (const key of deletion.keys) {
                const id = key?.id;
                if (id && chat.messages[id]) {
                    delete chat.messages[id];
                    markMsgDel(jid, id);
                }
            }
        }

        markChat(jid);
    };

    return h;
}

function attach(conn, h) {
    conn.ev.on("contacts.upsert", h.updateContacts);
    conn.ev.on("contacts.set", h.updateContacts);
    conn.ev.on("groups.update", h.onGroupsUpdate);
    conn.ev.on("chats.set", h.onChatsSet);
    conn.ev.on("chats.update", h.onChatsUpdate);
    conn.ev.on("group-participants.update", h.onGroupParticipantsUpdate);
    conn.ev.on("chats.upsert", h.onChatsUpsert);
    conn.ev.on("presence.update", h.onPresenceUpdate);
    conn.ev.on("messages.upsert", h.onMessagesUpsert);
    conn.ev.on("messages.update", h.onMessagesUpdate);
    conn.ev.on("messages.delete", h.onMessagesDelete);
}

function detach(conn, h) {
    try {
        conn.ev.off("contacts.upsert", h.updateContacts);
        conn.ev.off("contacts.set", h.updateContacts);
        conn.ev.off("groups.update", h.onGroupsUpdate);
        conn.ev.off("chats.set", h.onChatsSet);
        conn.ev.off("chats.update", h.onChatsUpdate);
        conn.ev.off("group-participants.update", h.onGroupParticipantsUpdate);
        conn.ev.off("chats.upsert", h.onChatsUpsert);
        conn.ev.off("presence.update", h.onPresenceUpdate);
        conn.ev.off("messages.upsert", h.onMessagesUpsert);
        conn.ev.off("messages.update", h.onMessagesUpdate);
        conn.ev.off("messages.delete", h.onMessagesDelete);
    } catch (e) {
        logger.debug(e.message);
    }
}

export function bind(conn) {
    if (!conn || !conn.ev) return false;
    if (conn[SYM_BOUND]) return true;

    const { db, ps } = openDB();
    Object.defineProperty(conn, SYM_SQL, { value: db, enumerable: false });
    Object.defineProperty(conn, SYM_PS, { value: { db, ps }, enumerable: false });

    if (!conn.chats) conn.chats = Object.create(null);
    ensureGroupCache(conn);

    loadDataFromDB(conn, ps);

    let flushing = false;
    let flushTimer = null;
    let flushScheduled = false;
    let flushRetries = 0;

    const dirtyChats = new Set();
    const dirtyGroups = new Set();
    const dirtyContacts = new Set();
    const dirtyMsgs = [];
    const dirtyMsgsDel = [];

    const schedule = (delay = FLUSH_MS) => {
        if (flushing) {
            flushScheduled = true;
            return;
        }
        if (flushTimer) return;
        flushScheduled = true;
        flushTimer = setTimeout(
            () => {
                flushTimer = null;
                flushScheduled = false;
                flush();
            },
            Math.max(0, delay)
        );
    };

    const markChat = (jid) => {
        dirtyChats.add(jid);
        schedule();
    };
    const markGroup = (jid) => {
        dirtyGroups.add(jid);
        schedule();
    };
    const markContact = (jid) => {
        dirtyContacts.add(jid);
        schedule();
    };
    const markMsg = (jid, id, ts, json) => {
        dirtyMsgs.push({ jid, id, ts, json });
        if (dirtyMsgs.length > FLUSH_MAX && !flushing) {
            if (flushTimer) {
                clearTimeout(flushTimer);
                flushTimer = null;
                flushScheduled = false;
            }
            schedule(0);
        } else {
            schedule();
        }
    };
    const markMsgDel = (jid, id) => {
        dirtyMsgsDel.push({ jid, id });
        schedule();
    };

    function flush() {
        if (flushing) return;
        flushing = true;

        const chatsToFlush = new Set(dirtyChats);
        const groupsToFlush = new Set(dirtyGroups);
        const contactsToFlush = new Set(dirtyContacts);
        const msgsToFlush = dirtyMsgs.slice();
        const msgsDelToFlush = dirtyMsgsDel.slice();

        dirtyChats.clear();
        dirtyGroups.clear();
        dirtyContacts.clear();
        dirtyMsgs.length = 0;
        dirtyMsgsDel.length = 0;

        try {
            db.transaction(() => {
                if (chatsToFlush.size) {
                    for (const jid of chatsToFlush) {
                        const c = conn.chats?.[jid];
                        if (!c) continue;
                        try {
                            ps.chatUp.run(
                                jid,
                                JSON.stringify({
                                    id: c.id,
                                    name: c.name || null,
                                    subject: c.subject || null,
                                    ephemeralDuration: c.ephemeralDuration || 0,
                                })
                            );
                        } catch (e) {
                            logger.debug(e.message);
                        }
                    }
                }

                if (groupsToFlush.size) {
                    for (const gid of groupsToFlush) {
                        const meta = conn.chats?.[gid]?.metadata;
                        if (meta) {
                            try {
                                ps.groupUp.run(gid, J.s(meta));
                            } catch (e) {
                                logger.debug(e.message);
                            }
                        }
                    }
                }

                if (contactsToFlush.size) {
                    for (const cid of contactsToFlush) {
                        const c = conn.chats?.[cid];
                        if (!c) continue;
                        try {
                            ps.contactUp.run(
                                cid,
                                JSON.stringify({
                                    id: cid,
                                    name: c.name || null,
                                    imgUrl: c.imgUrl || null,
                                })
                            );
                        } catch (e) {
                            logger.debug(e.message);
                        }
                    }
                }

                if (msgsDelToFlush.length) {
                    for (const { jid, id } of msgsDelToFlush) {
                        try {
                            if (id === null) {
                                ps.msgDelJid.run(jid);
                            } else {
                                ps.msgDel.run(jid, id);
                            }
                        } catch (e) {
                            logger.debug(e.message);
                        }
                    }
                }

                if (msgsToFlush.length) {
                    for (const { jid, id, ts, json } of msgsToFlush) {
                        try {
                            ps.msgUp.run(jid, id, ts || 0, json);
                        } catch (e) {
                            logger.debug(e.message);
                        }
                    }
                }
            })();

            flushRetries = 0;
        } catch (e) {
            logger.error(e);
            flushRetries++;

            if (flushRetries < MAX_FLUSH_RETRIES) {
                for (const jid of chatsToFlush) dirtyChats.add(jid);
                for (const gid of groupsToFlush) dirtyGroups.add(gid);
                for (const cid of contactsToFlush) dirtyContacts.add(cid);
                dirtyMsgs.push(...msgsToFlush);
                dirtyMsgsDel.push(...msgsDelToFlush);
            } else {
                logger.error(
                    `Flush failed after ${MAX_FLUSH_RETRIES} retries, dropping ${chatsToFlush.size} chats, ${msgsToFlush.length} messages`
                );
                flushRetries = 0;
            }
        } finally {
            flushing = false;
            const hasWork =
                dirtyChats.size ||
                dirtyGroups.size ||
                dirtyContacts.size ||
                dirtyMsgs.length ||
                dirtyMsgsDel.length;
            if (flushScheduled || hasWork) {
                // Use exponential backoff for retries
                const delay =
                    flushRetries > 0
                        ? Math.min(FLUSH_COOLDOWN_MS * Math.pow(2, flushRetries - 1), 5000)
                        : FLUSH_COOLDOWN_MS;
                schedule(delay);
            }
        }
    }

    const handlers = buildHandlers(conn, { markChat, markContact, markGroup, markMsg, markMsgDel });
    attach(conn, handlers);

    const timers = Object.create(null);

    timers.cacheCleanup = setInterval(() => {
        cleanupGroupCache(conn);
    }, CACHE_CLEANUP_INTERVAL_MS);

    Object.defineProperty(conn, SYM_TIMERS, { value: timers, enumerable: false });

    const onExit = () => {
        try {
            if (timers.cacheCleanup) {
                clearInterval(timers.cacheCleanup);
                timers.cacheCleanup = null;
            }

            if (flushTimer) {
                clearTimeout(flushTimer);
                flushTimer = null;
            }
            flush();
            try {
                db.pragma("optimize");
            } catch (e) {
                logger.debug(e.message);
            }
        } catch (e) {
            logger.error(e);
        }
    };

    if (conn[SYM_CLEANUP]) {
        const oldCleanup = conn[SYM_CLEANUP];
        try {
            if (oldCleanup.exitHandler) {
                process.removeListener("exit", oldCleanup.exitHandler);
            }
            if (oldCleanup.sigintHandler) {
                process.removeListener("SIGINT", oldCleanup.sigintHandler);
            }
            if (oldCleanup.sigtermHandler) {
                process.removeListener("SIGTERM", oldCleanup.sigtermHandler);
            }
            if (oldCleanup.detach) {
                oldCleanup.detach();
            }
        } catch (e) {
            logger.debug(e.message);
        }
    }

    const cleanup = {
        exitHandler: onExit,
        sigintHandler: () => {
            onExit();
            process.exit(0);
        },
        sigtermHandler: () => {
            onExit();
            process.exit(0);
        },
        detach: () => detach(conn, handlers),
    };

    process.on("exit", cleanup.exitHandler);
    process.on("SIGINT", cleanup.sigintHandler);
    process.on("SIGTERM", cleanup.sigtermHandler);

    Object.defineProperty(conn, SYM_CLEANUP, { value: cleanup, enumerable: false });
    Object.defineProperty(conn, SYM_HANDLERS, { value: handlers, enumerable: false });
    Object.defineProperty(conn, SYM_BOUND, { value: true, enumerable: false });

    return true;
}

export default { bind };
