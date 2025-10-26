export async function before(m, { conn }) {
    const toJid = (n) => {
        const raw = Array.isArray(n) ? n[0] : (n?.num ?? n?.id ?? n);
        const digits = String(raw ?? "").replace(/[^0-9]/g, "");
        return digits ? digits + "@s.whatsapp.net" : "";
    };

    const resolveOwners = async (conn, owners = []) => {
        if (!conn?.lidMappingStore) {
            return owners
                .map((entry) =>
                    toJid(Array.isArray(entry) ? entry[0] : (entry?.num ?? entry?.id ?? entry))
                )
                .filter(Boolean);
        }
        const cache = conn.lidMappingStore.cache;
        const out = new Set();
        for (const entry of owners) {
            const num = Array.isArray(entry) ? entry[0] : (entry?.num ?? entry?.id ?? entry);
            const jid = toJid(num);
            if (!jid) continue;
            out.add(jid);
            let lid = cache?.get(jid);
            if (!lid) {
                try {
                    lid = await conn.lidMappingStore.getLIDForPN(jid);
                } catch {
                    /* Jawa */
                }
            }
            if (lid) {
                out.add(lid);
                try {
                    cache?.set(jid, lid);
                    cache?.set(lid, jid);
                } catch {
                    /* Jawa */
                }
            }
            if (lid) {
                let back = cache?.get(lid);
                if (!back) {
                    try {
                        back = await conn.lidMappingStore.getPNForLID(lid);
                    } catch {
                        /* Jawa */
                    }
                }
                if (back) {
                    out.add(back);
                    try {
                        cache?.set(lid, back);
                        cache?.set(back, lid);
                    } catch {
                        /* Jawa */
                    }
                }
            }
        }
        return [...out];
    };

    const devOwners = global.config.owner.filter(([n, , isDev]) => n && isDev);
    const regOwners = global.config.owner.filter(([n, , isDev]) => n && !isDev);
    const devList = await resolveOwners(this, devOwners);
    const regList = await resolveOwners(this, regOwners);
    const isMods = devList.includes(m.sender);
    const isOwner = m.fromMe || isMods || regList.includes(m.sender);

    if (m.isBaileys || m.fromMe) return true;
    if (isOwner || isMods) return true;

    if (!m.isGroup) return true;

    const groupMetadata =
        (m.isGroup ? this.chats?.[m.chat]?.metadata || (await this.groupMetadata(m.chat)) : {}) ||
        {};
    const participants = m.isGroup ? groupMetadata.participants || [] : [];
    const jid = (id) => id?.replace(/:\d+@/, "@");
    const senderId = jid(this.decodeJid(m.sender));
    const botId = jid(this.decodeJid(this.user.id));
    const user =
        participants.find((u) => jid(u.id) === senderId || jid(u.phoneNumber) === senderId) || {};
    const bot =
        participants.find(
            (u) => u.id === this.user.id || jid(u.id) === botId || jid(u.phoneNumber) === botId
        ) || {};
    const isRAdmin = user?.admin === "superadmin";
    const isAdmin = isRAdmin || user?.admin === "admin";
    const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";
    if (isAdmin) return true;
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat?.antiAudio || !isBotAdmin) return true;
    if (m.mtype === "audioMessage") {
        try {
            await this.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.key.id,
                    participant: m.key.participant || m.sender,
                },
            });
        } catch (e) {
            conn.logger.error(e);
        }
    }

    return true;
}
