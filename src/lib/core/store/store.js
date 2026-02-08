/**
 * @file Pure in-memory store untuk WhatsApp data synchronization
 * @module store
 * @description Ultra-lightweight memory store dengan optimal performance
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { BufferJSON } from "baileys";

const TTL = {
    CHAT: 604800000,
    GROUP: 604800000,
};

const MAX_ENTRIES = 5000;
const CLEANUP_INTERVAL = 1800000;
const EVICT_PERCENTAGE = 0.2;

class MemoryStore {
    constructor() {
        this.data = new Map();
        this.lastAccess = new Map();
        this.expireAt = new Map();
        
        setInterval(() => this._cleanup(), CLEANUP_INTERVAL);
        setTimeout(() => this._cleanup(), 60000);
    }

    set(key, value, ttl = TTL.CHAT) {
        if (this.data.size >= MAX_ENTRIES) {
            this._evictLRU();
        }

        const now = Date.now();
        
        this.data.set(key, JSON.stringify(value, BufferJSON.replacer));
        this.lastAccess.set(key, now);
        
        if (ttl > 0) {
            this.expireAt.set(key, now + ttl);
        }
    }

    get(key) {
        const value = this.data.get(key);
        if (!value) return null;

        const expire = this.expireAt.get(key);
        if (expire && Date.now() > expire) {
            this._delete(key);
            return null;
        }

        this.lastAccess.set(key, Date.now());
        
        return JSON.parse(value, BufferJSON.reviver);
    }

    _delete(key) {
        this.data.delete(key);
        this.lastAccess.delete(key);
        this.expireAt.delete(key);
    }

    _evictLRU() {
        const toEvict = Math.floor(MAX_ENTRIES * EVICT_PERCENTAGE);
        
        const entries = [...this.lastAccess.entries()]
            .sort((a, b) => a[1] - b[1])
            .slice(0, toEvict);

        for (const [key] of entries) {
            this._delete(key);
        }
    }

    _cleanup() {
        const now = Date.now();
        const toDelete = [];

        for (const [key, expire] of this.expireAt.entries()) {
            if (now > expire) {
                toDelete.push(key);
            }
        }

        for (const key of toDelete) {
            this._delete(key);
        }
    }
}

const store = new MemoryStore();

const CHAT_KEY = (jid) => `c:${jid}`;

export default function bind(sock) {
    sock.getChat = (jid) => store.get(CHAT_KEY(jid));

    const setChat = (jid, data) => {
        const isGroup = jid.endsWith("@g.us");
        store.set(CHAT_KEY(jid), data, isGroup ? TTL.GROUP : TTL.CHAT);
    };

    const fetchGroup = (id) => {
        sock.groupMetadata(id)
            .then(meta => {
                if (!meta) return;
                
                const chat = sock.getChat(id) || { id };
                chat.subject = meta.subject;
                chat.metadata = meta;
                setChat(id, chat);
            })
            .catch(() => {});
    };

    const processChat = (chat) => {
        const id = sock.decodeJid(chat.id);
        if (!id || id === "status@broadcast") return;

        const isGroup = id.endsWith("@g.us");
        
        setChat(id, {
            id,
            conversationTimestamp: chat.conversationTimestamp,
            unreadCount: chat.unreadCount || 0,
            archived: chat.archived || false,
            pinned: chat.pinned || 0,
            name: chat.name,
            ...(isGroup && { subject: chat.name }),
        });

        if (isGroup) fetchGroup(id);
    };

    sock.ev.on("messaging-history.set", ({ chats }) => {
        if (chats) chats.forEach(processChat);
    });

    sock.ev.on("chats.set", ({ chats }) => {
        chats.forEach(processChat);
    });

    sock.ev.on("chats.upsert", (chats) => {
        for (const chat of chats) {
            const id = sock.decodeJid(chat.id);
            if (!id || id === "status@broadcast") continue;

            const existing = sock.getChat(id) || { id };
            setChat(id, { ...existing, ...chat });

            if (id.endsWith("@g.us") && !existing.metadata) {
                fetchGroup(id);
            }
        }
    });

    sock.ev.on("groups.update", (updates) => {
        for (const update of updates) {
            const id = sock.decodeJid(update.id);
            if (!id) continue;

            const chat = sock.getChat(id);
            if (chat) {
                if (update.subject) chat.subject = update.subject;
                if (update.desc) chat.desc = update.desc;
                setChat(id, chat);
            }
        }
    });

    sock.ev.on("group-participants.update", ({ id }) => {
        id = sock.decodeJid(id);
        if (id && id !== "status@broadcast") fetchGroup(id);
    });
}