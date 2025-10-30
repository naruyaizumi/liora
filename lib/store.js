/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { BufferJSON } from "baileys";
import pino from "pino";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB = path.join(__dirname, "../database/store.db");

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
const SYM_FLUSH_CONTROL = Symbol.for("liora.store.flush");

const GROUP_MD_TTL_MS = 60000;
const MAX_MSGS_PER_CHAT = 40;
const KEEP_RATIO = 0.75;
const FLUSH_MS = 40;
const FLUSH_MAX = 256;
const FLUSH_COOLDOWN_MS = 80;
const MSG_TTL_MS = Number(process.env.LIORA_MSG_TTL_MS || 0);
const CACHE_CLEANUP_INTERVAL_MS = 300000;
const MAX_FLUSH_RETRIES = 3;
const MAX_DIRTY_QUEUE_SIZE = 10000;

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
    const filename = DEFAULT_DB;
    
    if (!global.__storeDB) {
        try {
            global.__storeDB = new Database(filename, {
                timeout: 10000,
                fileMustExist: false
            });
            global.__storeDBRefCount = 0;
            global.__storeDBLock = false;
            global.__storeDBClosing = false;
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }
    
    global.__storeDBRefCount = (global.__storeDBRefCount || 0) + 1;
    const db = global.__storeDB;
    
    if (!db.__liora_init) {
        try {
            db.pragma("journal_mode = WAL");
            db.pragma("synchronous = NORMAL");
            db.pragma("temp_store = MEMORY");
            db.pragma("locking_mode = NORMAL");
            db.pragma("cache_spill = OFF");
            db.pragma("foreign_keys = OFF");
            db.pragma("cache_size = -65536");
            db.pragma("busy_timeout = 10000");
        } catch (e) {
            logger.debug(e.message);
        }
        
        try {
            db.exec(`
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, val TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS messages (
          jid TEXT NOT NULL,
          id TEXT NOT NULL,
          ts INTEGER,
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
        } catch (e) {
            logger.error(e);
            throw e;
        }
        
        const ps = {
            metaGet: db.prepare("SELECT val FROM meta WHERE key=?"),
            metaSet: db.prepare(
                "INSERT INTO meta(key,val) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val"
            ),
            chatUp: db.prepare(
                "INSERT OR REPLACE INTO chats(id,data) VALUES(?,?)"),
            chatAll: db.prepare("SELECT id,data FROM chats"),
            chatGet: db.prepare("SELECT data FROM chats WHERE id=?"),
            contactUp: db.prepare(
                "INSERT OR REPLACE INTO contacts(id,data) VALUES(?,?)"),
            contactAll: db.prepare("SELECT id,data FROM contacts"),
            groupUp: db.prepare(
                "INSERT OR REPLACE INTO groups(id,data) VALUES(?,?)"),
            groupAll: db.prepare("SELECT id,data FROM groups"),
            groupGet: db.prepare("SELECT data FROM groups WHERE id=?"),
            msgUp: db.prepare(
                "INSERT OR REPLACE INTO messages(jid,id,ts,json) VALUES(?,?,?,?)"
                ),
            msgGet: db.prepare(
                "SELECT json FROM messages WHERE jid=? AND id=?"),
            msgGetAll: db.prepare(
                "SELECT id,json FROM messages WHERE jid=? ORDER BY ts DESC LIMIT ?"
            ),
            msgDelJid: db.prepare("DELETE FROM messages WHERE jid=?"),
            msgDel: db.prepare("DELETE FROM messages WHERE jid=? AND id=?"),
        };
        
        let ver = Number(ps.metaGet.get("schema_version")?.val || 0);
        const migrateTo = (target) => {
            if (ver >= target) return;
            db.transaction(() => {
                if (target > ver) {
                    logger.info(
                        `Migrating schema from version ${ver} to ${target}`
                        );
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

function closeDB() {
    if (!global.__storeDB) return;
    
    if (global.__storeDBClosing) {
        logger.debug("Database close already in progress");
        return;
    }
    
    global.__storeDBRefCount = Math.max(0, (global.__storeDBRefCount || 1) - 1);
    
    if (global.__storeDBRefCount === 0) {
        global.__storeDBClosing = true;
        
        try {
            const maxWait = 1000;
            const startTime = Date.now();
            
            while (global.__storeDBLock && (Date.now() - startTime) <
                maxWait) {
                // Davina Karamoy
                }
            
            global.__storeDB.close();
            delete global.__storeDB;
            delete global.__storeDBRefCount;
            delete global.__storeDBLock;
            delete global.__storeDBClosing;
            logger.debug("Database closed successfully");
        } catch (e) {
            logger.error(e.message);
            global.__storeDBClosing = false;
        }
    }
}

async function getGroupMetadataCached(conn, jid) {
    ensureGroupCache(conn);
    const now = Date.now();
    const cache = conn._groupCache;
    const hit = cache.data.get(jid);
    
    if (hit && hit.exp > now && hit.value) return hit.value;
    
    if (hit && hit.exp > now && hit.value === null && hit.failedFetch) {
        return null;
    }
    
    const inflightPromise = cache.inflight.get(jid);
    if (inflightPromise) {
        try {
            return await inflightPromise;
        } catch (e) {
            logger.debug(e.message);
            cache.inflight.delete(jid);
            return null;
        }
    }
    
    const p = (async () => {
        try {
            const md = await conn.groupMetadata(jid).catch((
                e) => {
                    logger.debug(e.message);
                    return null;
                });
            
            if (md) {
                cache.data.set(jid, { exp: now +
                        GROUP_MD_TTL_MS, value: md,
                    failedFetch: false });
            } else {
                cache.data.set(jid, { exp: now +
                        GROUP_MD_TTL_MS / 2,
                    value: null, failedFetch: true });
            }
            
            cache.inflight.delete(jid);
            return md || null;
        } catch (e) {
            cache.data.set(jid, { exp: now + GROUP_MD_TTL_MS /
                    4, value: null, failedFetch: true });
            cache.inflight.delete(jid);
            logger.debug(e.message);
            return null;
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
    
    let num;
    
    if (typeof ts === "bigint") {
        try {
            if (ts > BigInt(Number.MAX_SAFE_INTEGER)) {
                return Date.now();
            }
            num = Number(ts);
        } catch (e) {
            logger.debug(e.message);
            return Date.now();
        }
    } else if (typeof ts === "number") {
        num = ts;
    } else if (typeof ts === "string") {
        num = Number(ts);
        if (isNaN(num) || !isFinite(num)) return Date.now();
    } else {
        return Date.now();
    }
    
    if (!Number.isFinite(num) || num < 0 || num > Number.MAX_SAFE_INTEGER) {
        return Date.now();
    }
    
    return num > 9999999999 ? num : num * 1000;
}

function buildHandlers(conn, dirty) {
    const { markChat, markContact, markGroup, markMsg, markMsgDel } = dirty;
    const h = Object.create(null);
    
    h.onChatsUpdate = function(updates) {
        try {
            if (!Array.isArray(updates)) return;
            
            for (const update of updates) {
                try {
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
                } catch (e) {
                    logger.debug(e.message);
                }
            }
        } catch (e) {
            logger.error(e);
        }
    };
    
    h.onGroupParticipantsUpdate = async function(update) {
        try {
            if (!update) return;
            const id = update.id;
            if (!id || isStatusJid(id) || !isGroupJid(id)) return;
            const chat = ensureChat(conn, id);
            chat.isChats = true;
            
            try {
                const md = await getGroupMetadataCached(conn, id);
                if (md) {
                    assignIf(chat, "subject", md.subject);
                    chat.metadata = md;
                    markGroup(id);
                }
                invalidateGroupCache(conn, id);
            } catch (e) {
                logger.debug(e.message);
                invalidateGroupCache(conn, id);
            }
            
            maybeTrimMessages(chat);
            markChat(id);
        } catch (e) {
            logger.error(e);
        }
    };
    
    h.onGroupsUpdate = async function(updates) {
        try {
            if (!Array.isArray(updates)) return;
            
            for (const upd of updates) {
                try {
                    const id = upd?.id;
                    if (!id || isStatusJid(id) || !isGroupJid(id))
                        continue;
                    const chat = ensureChat(conn, id);
                    chat.isChats = true;
                    
                    try {
                        const md = await getGroupMetadataCached(conn,
                            id);
                        if (md) {
                            chat.metadata = md;
                            assignIf(chat, "subject", upd.subject || md
                                .subject);
                            markGroup(id);
                        }
                        invalidateGroupCache(conn, id);
                    } catch (e) {
                        logger.debug(e.message);
                        invalidateGroupCache(conn, id);
                    }
                    
                    maybeTrimMessages(chat);
                    markChat(id);
                } catch (e) {
                    logger.debug(e.message);
                }
            }
        } catch (e) {
            logger.error(e);
        }
    };
    
    h.onMessagesUpsert = function({ messages, _type }) {
        try {
            if (!Array.isArray(messages)) return;
            
            for (const msg of messages) {
                try {
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
                } catch (e) {
                    logger.debug(e.message);
                }
            }
        } catch (e) {
            logger.error(e);
        }
    };
    
    h.onMessagesUpdate = function(updates) {
        try {
            if (!Array.isArray(updates)) return;
            
            for (const update of updates) {
                try {
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
                        chat.messages[id] = { key: update.key, ...update
                            .update };
                        const ts = extractTimestamp(update);
                        markMsg(jid, id, ts, J.s(chat.messages[id]));
                    }
                    
                    maybeTrimMessages(chat);
                    markChat(jid);
                } catch (e) {
                    logger.debug(e.message);
                }
            }
        } catch (e) {
            logger.error(e);
        }
    };
    
    h.onPresenceUpdate = function(presence) {
        try {
            if (!presence) return;
        } catch (e) {
            logger.debug(e.message);
        }
    };
    
    h.onContactsUpdate = function(updates) {
        try {
            if (!Array.isArray(updates)) return;
            
            for (const update of updates) {
                try {
                    const id = update?.id;
                    if (!id || isStatusJid(id)) continue;
                    
                    const chat = ensureChat(conn, id);
                    
                    if (update.name !== undefined) {
                        chat.name = update.name;
                    }
                    if (update.imgUrl !== undefined) {
                        chat.imgUrl = update.imgUrl;
                    }
                    if (update.verifiedName !== undefined) {
                        chat.verifiedName = update.verifiedName;
                    }
                    
                    markContact(id);
                } catch (e) {
                    logger.debug(e.message);
                }
            }
        } catch (e) {
            logger.error(e);
        }
    };
    
    h.onMessagesDelete = function(deletion) {
        try {
            if (!deletion) return;
            
            if (deletion.all) {
                const jid = deletion.jid;
                if (!jid || isStatusJid(jid)) return;
                
                const chat = conn.chats?.[jid];
                if (chat?.messages) {
                    chat.messages = Object.create(null);
                }
                
                markMsgDel(jid, null);
                markChat(jid);
                return;
            }
            
            const jid = deletion.keys?.[0]?.remoteJid;
            if (!jid || isStatusJid(jid)) return;
            
            const chat = conn.chats?.[jid];
            if (!chat?.messages) return;
            
            for (const key of deletion.keys || []) {
                const msgId = key.id;
                if (msgId && chat.messages[msgId]) {
                    delete chat.messages[msgId];
                    markMsgDel(jid, msgId);
                }
            }
            
            markChat(jid);
        } catch (e) {
            logger.error(e);
        }
    };
    
    h.onCall = function(calls) {
        try {
            if (!Array.isArray(calls)) return;
        } catch (e) {
            logger.debug(e.message);
        }
    };
    
    return h;
}

function attach(conn, h) {
    try {
        conn.ev.on("chats.update", h.onChatsUpdate);
        conn.ev.on("groups.update", h.onGroupsUpdate);
        conn.ev.on("group-participants.update", h.onGroupParticipantsUpdate);
        conn.ev.on("messages.upsert", h.onMessagesUpsert);
        conn.ev.on("messages.update", h.onMessagesUpdate);
        conn.ev.on("presence.update", h.onPresenceUpdate);
        conn.ev.on("contacts.update", h.onContactsUpdate);
        conn.ev.on("messages.delete", h.onMessagesDelete);
        conn.ev.on("call", h.onCall);
    } catch (e) {
        logger.error(e);
        throw e;
    }
}

function detach(conn, h) {
    try {
        conn.ev.off("chats.update", h.onChatsUpdate);
        conn.ev.off("groups.update", h.onGroupsUpdate);
        conn.ev.off("group-participants.update", h.onGroupParticipantsUpdate);
        conn.ev.off("messages.upsert", h.onMessagesUpsert);
        conn.ev.off("messages.update", h.onMessagesUpdate);
        conn.ev.off("presence.update", h.onPresenceUpdate);
        conn.ev.off("contacts.update", h.onContactsUpdate);
        conn.ev.off("messages.delete", h.onMessagesDelete);
        conn.ev.off("call", h.onCall);
    } catch (e) {
        logger.debug(e.message);
    }
}

export function bind(conn) {
    if (!conn || !conn.ev) {
        logger.error("Invalid connection object");
        return false;
    }
    
    if (conn[SYM_BOUND]) {
        logger.debug("Connection already bound");
        return true;
    }
    
    const { db, ps } = openDB();
    Object.defineProperty(conn, SYM_SQL, { value: db, enumerable: false });
    Object.defineProperty(conn, SYM_PS, { value: { db, ps },
        enumerable: false });
    
    if (!conn.chats) conn.chats = Object.create(null);
    ensureGroupCache(conn);
    
    loadDataFromDB(conn, ps);
    
    let flushing = false;
    let flushTimer = null;
    let flushRetries = 0;
    let pendingReschedule = false;
    let lastFlushTime = 0;
    
    const dirtyChats = new Set();
    const dirtyGroups = new Set();
    const dirtyContacts = new Set();
    const dirtyMsgs = [];
    const dirtyMsgsDel = [];
    
    const schedule = (delay = FLUSH_MS) => {
        if (flushing) {
            pendingReschedule = true;
            return;
        }
        
        if (flushTimer !== null) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
        
        const timeSinceLastFlush = Date.now() - lastFlushTime;
        const minDelay = Math.max(delay, FLUSH_MS - timeSinceLastFlush);
        
        flushTimer = setTimeout(
            () => {
                flushTimer = null;
                flush();
            },
            Math.max(0, minDelay)
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
        if (dirtyMsgs.length >= MAX_DIRTY_QUEUE_SIZE) {
            logger.warn(
                `Message queue full (${dirtyMsgs.length}), forcing immediate flush`
                );
            
            if (flushTimer !== null) {
                clearTimeout(flushTimer);
                flushTimer = null;
            }
            
            if (!flushing) {
                flush();
            }
            
            if (dirtyMsgs.length >= MAX_DIRTY_QUEUE_SIZE) {
                logger.error(
                    "Message queue still full after flush, dropping oldest message"
                    );
                dirtyMsgs.shift();
            }
        }
        
        dirtyMsgs.push({ jid, id, ts, json });
        
        if (dirtyMsgs.length >= FLUSH_MAX && !flushing) {
            if (flushTimer !== null) {
                clearTimeout(flushTimer);
                flushTimer = null;
            }
            schedule(0);
        } else {
            schedule();
        }
    };
    
    const markMsgDel = (jid, id) => {
        if (dirtyMsgsDel.length >= MAX_DIRTY_QUEUE_SIZE) {
            logger.warn(
                "Delete queue full, dropping oldest delete operation");
            dirtyMsgsDel.shift();
        }
        dirtyMsgsDel.push({ jid, id });
        schedule();
    };
    
    function flush() {
        if (flushing) {
            logger.debug("Flush already in progress, skipping");
            return;
        }
        
        if (global.__storeDBLock) {
            logger.debug("Database locked, rescheduling flush");
            schedule(FLUSH_COOLDOWN_MS);
            return;
        }
        
        flushing = true;
        global.__storeDBLock = true;
        pendingReschedule = false;
        lastFlushTime = Date.now();
        
        const chatsToFlush = new Set(dirtyChats);
        const groupsToFlush = new Set(dirtyGroups);
        const contactsToFlush = new Set(dirtyContacts);
        const msgsToFlush = [...dirtyMsgs];
        const msgsDelToFlush = [...dirtyMsgsDel];
        
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
                                    ephemeralDuration: c
                                        .ephemeralDuration || 0,
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
                logger.warn(
                    `Retry ${flushRetries}/${MAX_FLUSH_RETRIES} for flush`);
                
                for (const jid of chatsToFlush) {
                    if (dirtyChats.size < MAX_DIRTY_QUEUE_SIZE) {
                        dirtyChats.add(jid);
                    }
                }
                for (const gid of groupsToFlush) {
                    if (dirtyGroups.size < MAX_DIRTY_QUEUE_SIZE) {
                        dirtyGroups.add(gid);
                    }
                }
                for (const cid of contactsToFlush) {
                    if (dirtyContacts.size < MAX_DIRTY_QUEUE_SIZE) {
                        dirtyContacts.add(cid);
                    }
                }
                
                const spaceAvailable = MAX_DIRTY_QUEUE_SIZE - dirtyMsgs.length;
                if (spaceAvailable > 0) {
                    const toReAdd = msgsToFlush.slice(0, spaceAvailable);
                    dirtyMsgs.unshift(...toReAdd);
                    
                    if (msgsToFlush.length > spaceAvailable) {
                        logger.warn(
                            `Dropped ${msgsToFlush.length - spaceAvailable} messages due to queue size limit`
                            );
                    }
                }
                
                const delSpaceAvailable = MAX_DIRTY_QUEUE_SIZE - dirtyMsgsDel
                    .length;
                if (delSpaceAvailable > 0) {
                    const toReAdd = msgsDelToFlush.slice(0, delSpaceAvailable);
                    dirtyMsgsDel.unshift(...toReAdd);
                }
                
                pendingReschedule = true;
            } else {
                logger.error(
                    `Flush failed after ${MAX_FLUSH_RETRIES} retries, dropping data: ` +
                    `${chatsToFlush.size} chats, ${groupsToFlush.size} groups, ` +
                    `${contactsToFlush.size} contacts, ${msgsToFlush.length} messages, ` +
                    `${msgsDelToFlush.length} deletes`
                );
                flushRetries = 0;
            }
        } finally {
            flushing = false;
            global.__storeDBLock = false;
            
            const hasWork =
                dirtyChats.size > 0 ||
                dirtyGroups.size > 0 ||
                dirtyContacts.size > 0 ||
                dirtyMsgs.length > 0 ||
                dirtyMsgsDel.length > 0 ||
                pendingReschedule;
            
            if (hasWork) {
                const delay =
                    flushRetries > 0 ?
                    Math.min(FLUSH_COOLDOWN_MS * Math.pow(2, flushRetries - 1),
                        5000) :
                    FLUSH_COOLDOWN_MS;
                schedule(delay);
            }
        }
    }
    
    const handlers = buildHandlers(conn, {
        markChat,
        markContact,
        markGroup,
        markMsg,
        markMsgDel
    });
    
    attach(conn, handlers);
    
    const timers = Object.create(null);
    
    timers.cacheCleanup = setInterval(() => {
        try {
            cleanupGroupCache(conn);
        } catch (e) {
            logger.error(e);
        }
    }, CACHE_CLEANUP_INTERVAL_MS);
    
    const flushControl = {
        get timer() { return flushTimer; },
        set timer(val) { flushTimer = val; },
        flush,
        get isFlushing() { return flushing; },
    };
    
    Object.defineProperty(conn, SYM_TIMERS, { value: timers,
        enumerable: false });
    Object.defineProperty(conn, SYM_FLUSH_CONTROL, { value: flushControl,
        enumerable: false });
    
    const onExit = async () => {
        try {
            if (timers.cacheCleanup) {
                clearInterval(timers.cacheCleanup);
                timers.cacheCleanup = null;
            }
            
            if (flushControl.timer !== null) {
                clearTimeout(flushControl.timer);
                flushControl.timer = null;
            }
            
            const waitForFlush = () => {
                return new Promise((resolve) => {
                    const startTime = Date.now();
                    const checkInterval = setInterval(
                () => {
                        if (!flushing || Date
                        .now() - startTime > 5000) {
                            clearInterval(
                                checkInterval);
                            resolve();
                        }
                    }, 100);
                });
            };
            
            await waitForFlush();
            
            if (flushing) {
                logger.warn(
                    "Flush still in progress during exit, forcing close"
                    );
            } else {
                flush();
            }
            
            try {
                db.pragma("optimize");
            } catch (e) {
                logger.debug(e.message);
            }
            
            closeDB();
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
        exitHandler: () => {
            const timeout = setTimeout(() => {
                logger.warn("Exit cleanup timeout exceeded");
            }, 4000);
            
            try {
                if (timers.cacheCleanup) {
                    clearInterval(timers.cacheCleanup);
                    timers.cacheCleanup = null;
                }
                if (flushControl.timer !== null) {
                    clearTimeout(flushControl.timer);
                    flushControl.timer = null;
                }
                
                if (!flushing) {
                    flush();
                }
                
                try {
                    db.pragma("optimize");
                } catch (e) {
                    logger.debug(e.message);
                }
                
                closeDB();
            } catch (e) {
                logger.error(e);
            } finally {
                clearTimeout(timeout);
            }
        },
        sigintHandler: async () => {
            logger.info("Received SIGINT, cleaning up...");
            await onExit();
            process.exit(0);
        },
        sigtermHandler: async () => {
            logger.info("Received SIGTERM, cleaning up...");
            await onExit();
            process.exit(0);
        },
        detach: () => {
            try {
                detach(conn, handlers);
            } catch (e) {
                logger.debug(e.message);
            }
        },
    };
    
    process.on("exit", cleanup.exitHandler);
    process.on("SIGINT", cleanup.sigintHandler);
    process.on("SIGTERM", cleanup.sigtermHandler);
    
    Object.defineProperty(conn, SYM_CLEANUP, { value: cleanup,
        enumerable: false });
    Object.defineProperty(conn, SYM_HANDLERS, { value: handlers,
        enumerable: false });
    Object.defineProperty(conn, SYM_BOUND, { value: true, enumerable: false });
    
    logger.info("Store bound successfully");
    return true;
}

export default { bind };