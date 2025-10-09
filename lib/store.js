/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { BufferJSON } from "baileys";

const SYM_BOUND = Symbol.for("liora.store.bound");
const SYM_HANDLERS = Symbol.for("liora.store.handlers");
const SYM_SQL = Symbol.for("liora.store.db");
const SYM_PS = Symbol.for("liora.store.prepared");
const SYM_TIMERS = Symbol.for("liora.store.timers");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../database/store.db");
const GROUP_MD_TTL_MS = 60_000;
const MAX_MSGS_PER_CHAT = 40;
const KEEP_RATIO = 0.75;
const CHECKPOINT_INTERVAL_MS = 10 * 60 * 1000;
const OPTIMIZE_CHANCE = 0.05;
const VACUUM_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FLUSH_MS = 200;
const FLUSH_MAX = 128;

const isStatusJid = (id) => !id || id === "status@broadcast";
const isGroupJid = (id = "") => id.endsWith("@g.us");

const J = {
    s: (o) => JSON.stringify(o, BufferJSON.replacer),
    p: (s) => JSON.parse(s, BufferJSON.reviver),
};

function assignIf(obj, key, val) {
    if (val === undefined || val === null) return;
    if (obj[key] !== val) obj[key] = val;
}

function ensureChat(conn, jid) {
    if (!conn.chats) conn.chats = Object.create(null);
    return (conn.chats[jid] ||= { id: jid });
}

function maybeTrimMessages(chat) {
    const msgs = chat.messages;
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
    if (!conn.lidCache) {
        Object.defineProperty(conn, "lidCache", {
            value: new Map(),
            enumerable: false,
            configurable: false,
            writable: true,
        });
    }
}

function openDB(dbPath = DB_PATH) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath, { timeout: 5000, fileMustExist: false });

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("temp_store = MEMORY");
    db.pragma("cache_size = -131072");
    db.pragma("mmap_size = 134217728");
    db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      val TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chats (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    /* messages tabel disediakan (opsional dipakai),
       tapi store ini tetap fokus meta & LID mapping */
    CREATE TABLE IF NOT EXISTS messages (
      jid  TEXT NOT NULL,
      id   TEXT NOT NULL,
      ts   INTEGER,
      json TEXT NOT NULL,
      PRIMARY KEY (jid, id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_jid_ts ON messages (jid, ts);

    /* LID mapping: phone JID (pn) ↔ lid */
    CREATE TABLE IF NOT EXISTS lids (
      pn   TEXT PRIMARY KEY,
      lid  TEXT UNIQUE,
      at   INTEGER
    );
  `);

    const ps = {
        metaGet: db.prepare("SELECT val FROM meta WHERE key=?"),
        metaSet: db.prepare(
            "INSERT INTO meta(key,val) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val"
        ),

        chatUp: db.prepare("INSERT OR REPLACE INTO chats(id,data) VALUES(?,?)"),
        chatAll: db.prepare("SELECT id,data FROM chats"),

        contactUp: db.prepare("INSERT OR REPLACE INTO contacts(id,data) VALUES(?,?)"),

        groupUp: db.prepare("INSERT OR REPLACE INTO groups(id,data) VALUES(?,?)"),

        msgUp: db.prepare("INSERT OR REPLACE INTO messages(jid,id,ts,json) VALUES(?,?,?,?)"),
        msgDelJid: db.prepare("DELETE FROM messages WHERE jid=?"),

        lidUp: db.prepare(`INSERT INTO lids(pn,lid,at) VALUES(?,?,?)
                          ON CONFLICT(pn) DO UPDATE SET lid=excluded.lid, at=excluded.at`),
        lidByPN: db.prepare("SELECT lid FROM lids WHERE pn=?"),
        pnByLID: db.prepare("SELECT pn  FROM lids WHERE lid=?"),
    };

    let ver = Number(ps.metaGet.get("schema_version")?.val || 1);
    const migrateTo = (target) => {
        if (ver >= target) return;
        db.transaction(() => {
            switch (target) {
                case 2: {
                    // db.exec("CREATE INDEX IF NOT EXISTS idx_messages_id ON messages(id)")
                    break;
                }
                default:
                    break;
            }
            ver = target;
            ps.metaSet.run("schema_version", String(ver));
        })();
    };
    migrateTo(1);
    // migrateTo(2)

    return { db, ps };
}

async function getGroupMetadataCached(conn, jid) {
    ensureGroupCache(conn);
    const now = Date.now();
    const cache = conn._groupCache;

    const hit = cache.data.get(jid);
    if (hit && hit.exp > now && hit.value) return hit.value;

    if (cache.inflight.has(jid)) {
        try {
            return await cache.inflight.get(jid);
        } catch {
            /* ignore */
        }
    }

    const p = (async () => {
        try {
            const md = await conn.groupMetadata(jid).catch(() => null);
            if (md && Array.isArray(md.participants)) {
                for (const p of md.participants) {
                    if (p.id && p.lid) {
                        try {
                            conn.lidCache.set(p.id, p.lid);
                            conn.lidCache.set(p.lid, p.id);
                        } catch {}
                        try {
                            conn.lidMappingStore?.put?.(p.id, p.lid);
                        } catch {}
                    }
                }
            }
            cache.data.set(jid, { exp: now + GROUP_MD_TTL_MS, value: md || null });
            return md || null;
        } finally {
            cache.inflight.delete(jid);
        }
    })();

    cache.inflight.set(jid, p);
    return p;
}

function buildHandlers(conn, dirty) {
    const { ps } = conn[SYM_PS];
    const { markChat, markContact, markGroup, markMsg } = dirty;

    const h = Object.create(null);

    h.updateContacts = function updateContacts(payload) {
        const list = payload?.contacts || payload || [];
        for (const contact of list) {
            const id = contact?.id;
            if (isStatusJid(id)) continue;

            const chat = ensureChat(conn, id);

            if (isGroupJid(id)) {
                assignIf(chat, "subject", contact.subject || contact.name || chat.subject || "");
            } else {
                assignIf(
                    chat,
                    "name",
                    contact.notify || contact.name || chat.name || chat.notify || ""
                );
            }

            for (const [k, v] of Object.entries(contact)) {
                if (k === "id") continue;
                if (v !== undefined && v !== null) chat[k] = v;
            }

            try {
                ps.contactUp.run(
                    id,
                    JSON.stringify({
                        id,
                        name: chat.name || null,
                        imgUrl: chat.imgUrl || null,
                    })
                );
            } catch {}

            maybeTrimMessages(chat);
            markContact(id);
            markChat(id);
        }
    };

    h.onChatsSet = async function onChatsSet({ chats }) {
        for (let { id, name, readOnly } of chats || []) {
            if (isStatusJid(id)) continue;

            const chat = ensureChat(conn, id);
            chat.isChats = !readOnly;

            if (name) {
                if (isGroupJid(id)) assignIf(chat, "subject", name);
                else assignIf(chat, "name", name);
            }

            if (isGroupJid(id)) {
                const md = await getGroupMetadataCached(conn, id);
                if (md) {
                    assignIf(chat, "subject", chat.subject || md.subject);
                    chat.metadata = md;
                    markGroup(id);
                }
            }

            maybeTrimMessages(chat);
            markChat(id);
        }
    };

    h.onGroupParticipantsUpdate = async function onGroupParticipantsUpdate({ id }) {
        if (isStatusJid(id) || !isGroupJid(id)) return;

        const chat = ensureChat(conn, id);
        chat.isChats = true;

        const md = await getGroupMetadataCached(conn, id);
        if (md) {
            assignIf(chat, "subject", md.subject);
            chat.metadata = md;
            for (const p of md.participants || []) {
                if (p.id && p.lid) {
                    try {
                        conn.lidCache.set(p.id, p.lid);
                        conn.lidCache.set(p.lid, p.id);
                    } catch {}
                    try {
                        conn.lidMappingStore?.put?.(p.id, p.lid);
                    } catch {}
                }
            }
            markGroup(id);
        }

        maybeTrimMessages(chat);
        markChat(id);
    };

    h.onGroupsUpdate = async function onGroupsUpdate(updates) {
        for (const upd of updates || []) {
            const id = upd?.id;
            if (isStatusJid(id) || !isGroupJid(id)) continue;

            const chat = ensureChat(conn, id);
            chat.isChats = true;

            const md = await getGroupMetadataCached(conn, id);
            if (md) {
                chat.metadata = md;
                assignIf(chat, "subject", upd.subject || md.subject);
                for (const p of md.participants || []) {
                    if (p.id && p.lid) {
                        try {
                            conn.lidCache.set(p.id, p.lid);
                            conn.lidCache.set(p.lid, p.id);
                        } catch {}
                        try {
                            conn.lidMappingStore?.put?.(p.id, p.lid);
                        } catch {}
                    }
                }
                markGroup(id);
            }

            maybeTrimMessages(chat);
            markChat(id);
        }
    };

    h.onChatsUpsert = function onChatsUpsert(chatsUpsert) {
        const id = chatsUpsert?.id;
        if (isStatusJid(id)) return;

        const prev = conn.chats?.[id] || {};
        conn.chats[id] = { ...prev, ...chatsUpsert, isChats: true };

        if (isGroupJid(id)) conn.insertAllGroup?.().catch(() => {});

        maybeTrimMessages(conn.chats[id]);
        markChat(id);
    };

    h.onPresenceUpdate = function onPresenceUpdate({ id, presences }) {
        const sender = (presences && Object.keys(presences)[0]) || id;
        if (!sender) return;

        const presence = presences?.[sender]?.lastKnownPresence || "composing";
        const chat = ensureChat(conn, sender);

        assignIf(chat, "presences", presence);
        if (isGroupJid(id || "")) ensureChat(conn, id);

        maybeTrimMessages(chat);
        markChat(sender);
    };

    return h;
}

function attach(conn, h) {
    conn.ev.on("contacts.upsert", h.updateContacts);
    conn.ev.on("groups.update", h.updateContacts);
    conn.ev.on("contacts.set", h.updateContacts);

    conn.ev.on("chats.set", h.onChatsSet);
    conn.ev.on("group-participants.update", h.onGroupParticipantsUpdate);
    conn.ev.on("groups.update", h.onGroupsUpdate);
    conn.ev.on("chats.upsert", h.onChatsUpsert);
    conn.ev.on("presence.update", h.onPresenceUpdate);
}

export function bind(conn) {
    if (!conn || !conn.ev) return false;
    if (conn[SYM_BOUND]) return true;

    const { db, ps } = openDB(DB_PATH);
    Object.defineProperty(conn, SYM_SQL, { value: db });
    Object.defineProperty(conn, SYM_PS, { value: { db, ps } });

    if (!conn.chats) conn.chats = Object.create(null);
    ensureGroupCache(conn);
    if (!conn.lidCache)
        Object.defineProperty(conn, "lidCache", { value: new Map(), enumerable: false });

    const lidCache = conn.lidCache;
    const lidMappingStore = {
        put(pn, lid) {
            if (!pn || !lid) return false;
            try {
                lidCache.set(pn, lid);
                lidCache.set(lid, pn);
                ps.lidUp.run(pn, lid, Date.now());
                return true;
            } catch {
                return false;
            }
        },
        async getLIDForPN(pnOrJid) {
            if (!pnOrJid) return null;
            const key = pnOrJid;
            let lid = lidCache.get(key);
            if (!lid) {
                try {
                    lid = ps.lidByPN.get(key)?.lid || null;
                } catch {}
            }
            if (!lid && typeof conn.onWhatsApp === "function") {
                try {
                    const r = await conn.onWhatsApp([key]).catch(() => null);
                    const x = Array.isArray(r) ? r[0] : null;
                    if (x?.exists && x?.lid) {
                        lid = x.lid;
                        try {
                            lidMappingStore.put(key, lid);
                        } catch {}
                    }
                } catch {}
            }
            return lid || null;
        },
        async getPNForLID(lid) {
            if (!lid) return null;
            let pn = lidCache.get(lid);
            if (!pn) {
                try {
                    pn = ps.pnByLID.get(lid)?.pn || null;
                } catch {}
                if (pn) {
                    try {
                        lidCache.set(lid, pn);
                        lidCache.set(pn, lid);
                    } catch {}
                }
            }
            return pn || null;
        },
        cache: lidCache,
    };
    Object.defineProperty(conn, "lidMappingStore", { value: lidMappingStore, enumerable: false });

    let flushing = false;
    let flushTimer = null;
    const dirtyChats = new Set();
    const dirtyGroups = new Set();
    const dirtyContacts = new Set();
    const dirtyMsgs = [];

    const schedule = () => {
        if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
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
        if (dirtyMsgs.length > FLUSH_MAX) flush();
    };

    function flush() {
        if (flushing) return;
        flushing = true;
        clearTimeout(flushTimer);
        flushTimer = null;
        try {
            db.transaction(() => {
                if (dirtyChats.size) {
                    for (const jid of dirtyChats) {
                        const c = conn.chats[jid];
                        if (!c) continue;
                        ps.chatUp.run(
                            jid,
                            JSON.stringify({
                                id: c.id,
                                name: c.name || null,
                                subject: c.subject || null,
                                ephemeralDuration: c.ephemeralDuration || 0,
                            })
                        );
                    }
                    dirtyChats.clear();
                }
                if (dirtyGroups.size) {
                    for (const gid of dirtyGroups) {
                        const meta = conn.chats[gid]?.metadata;
                        if (meta) ps.groupUp.run(gid, J.s(meta));
                    }
                    dirtyGroups.clear();
                }
                if (dirtyContacts.size) {
                    for (const cid of dirtyContacts) {
                        const c = conn.chats[cid];
                        if (!c) continue;
                        ps.contactUp.run(
                            cid,
                            JSON.stringify({
                                id: cid,
                                name: c.name || null,
                                imgUrl: c.imgUrl || null,
                            })
                        );
                    }
                    dirtyContacts.clear();
                }
                if (dirtyMsgs.length) {
                    for (const { jid, id, ts, json } of dirtyMsgs)
                        ps.msgUp.run(jid, id, ts || 0, json);
                    dirtyMsgs.length = 0;
                }
            })();
            if (Math.random() < OPTIMIZE_CHANCE) {
                try {
                    db.prepare("PRAGMA wal_checkpoint(FULL);").run();
                    db.prepare("PRAGMA optimize;").run();
                } catch {}
            }
        } catch (e) {
            console.error("[store.flush]", e.message);
        } finally {
            flushing = false;
        }
    }

    const handlers = buildHandlers(conn, { markChat, markContact, markGroup, markMsg });
    attach(conn, handlers);

    const timers = {
        checkpoint: setInterval(() => {
            try {
                db.prepare("PRAGMA wal_checkpoint(FULL);").run();
            } catch {}
        }, CHECKPOINT_INTERVAL_MS),
        vacuum: setInterval(() => {
            try {
                db.exec("VACUUM");
            } catch {}
        }, VACUUM_INTERVAL_MS),
    };
    Object.defineProperty(conn, SYM_TIMERS, { value: timers });

    const onExit = () => {
        try {
            flush();
            db.prepare("PRAGMA wal_checkpoint(FULL);").run();
            db.prepare("PRAGMA optimize;").run();
            if (timers.checkpoint) clearInterval(timers.checkpoint);
            if (timers.vacuum) clearInterval(timers.vacuum);
            db.close();
        } catch {}
    };
    process.once("exit", onExit);
    process.once("SIGINT", () => {
        onExit();
        process.exit(0);
    });
    process.once("SIGTERM", () => {
        onExit();
        process.exit(0);
    });

    Object.defineProperty(conn, SYM_HANDLERS, { value: handlers, enumerable: false });
    Object.defineProperty(conn, SYM_BOUND, { value: true, enumerable: false });

    return true;
}

export default { bind };
