/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

const SYM_BOUND = Symbol.for("liora.store.bound");
const SYM_HANDLERS = Symbol.for("liora.store.handlers");
const GROUP_MD_TTL_MS = 60000;
const MAX_MSGS_PER_CHAT = 40;

const isStatusJid = (id) => !id || id === "status@broadcast";
const isGroupJid = (id = "") => id.endsWith("@g.us");

function assignIf(obj, key, val) {
    if (val === undefined || val === null) return;
    if (obj[key] !== val) obj[key] = val;
}

function ensureChat(conn, jid) {
    if (!conn.chats) conn.chats = {};
    return (conn.chats[jid] ||= { id: jid });
}

function maybeTrimMessages(chat) {
    const msgs = chat.messages;
    if (!msgs) return;
    const keys = Object.keys(msgs);
    const n = keys.length;
    if (n <= MAX_MSGS_PER_CHAT) return;

    const keep = Math.max(1, Math.floor(MAX_MSGS_PER_CHAT * 0.75));
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
            /* jawa */
        }
    }

    const p = (async () => {
        try {
            const md = await conn.groupMetadata(jid).catch(() => null);
            cache.data.set(jid, { exp: now + GROUP_MD_TTL_MS, value: md || null });
            return md || null;
        } finally {
            cache.inflight.delete(jid);
        }
    })();

    cache.inflight.set(jid, p);
    return p;
}

function buildHandlers(conn) {
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

            maybeTrimMessages(chat);
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
                }
            }

            maybeTrimMessages(chat);
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
        }

        maybeTrimMessages(chat);
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
            }

            maybeTrimMessages(chat);
        }
    };

    h.onChatsUpsert = function onChatsUpsert(chatsUpsert) {
        const id = chatsUpsert?.id;
        if (isStatusJid(id)) return;

        const prev = conn.chats?.[id] || {};
        conn.chats[id] = { ...prev, ...chatsUpsert, isChats: true };

        if (isGroupJid(id)) {
            conn.insertAllGroup?.().catch(() => {});
        }

        maybeTrimMessages(conn.chats[id]);
    };

    h.onPresenceUpdate = function onPresenceUpdate({ id, presences }) {
        const sender = (presences && Object.keys(presences)[0]) || id;
        if (!sender) return;

        const presence = presences?.[sender]?.lastKnownPresence || "composing";
        const chat = ensureChat(conn, sender);

        assignIf(chat, "presences", presence);
        if (isGroupJid(id || "")) ensureChat(conn, id);

        maybeTrimMessages(chat);
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

    if (!conn.chats) conn.chats = Object.create(null);

    const handlers = buildHandlers(conn);
    attach(conn, handlers);

    Object.defineProperty(conn, SYM_HANDLERS, {
        value: handlers,
        enumerable: false,
        configurable: false,
        writable: false,
    });
    Object.defineProperty(conn, SYM_BOUND, {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false,
    });

    return true;
}

export default { bind };
