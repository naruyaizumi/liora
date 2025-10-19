const linkRegex = /\b((https?|ftp):\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.[a-z]{2,}(\/[^\s]*)?)/gi;

export async function before(m) {
    const toJid = (n) => {
        const raw = Array.isArray(n) ? n[0] : (n?.num ?? n?.lid ?? n);
        const digits = String(raw ?? "").replace(/[^0-9]/g, "");
        return digits ? digits + "@s.whatsapp.net" : "";
    };

    const resolveOwners = async (conn, owners = []) => {
        if (!conn?.lidMappingStore) {
            return owners
                .map((entry) =>
                    toJid(Array.isArray(entry) ? entry[0] : (entry?.num ?? entry?.lid ?? entry))
                )
                .filter(Boolean);
        }
        const cache = conn.lidMappingStore.cache;
        const out = new Set();
        for (const entry of owners) {
            const num = Array.isArray(entry) ? entry[0] : (entry?.num ?? entry?.lid ?? entry);
            const jid = toJid(num);
            if (!jid) continue;
            out.add(jid);
            let lid = cache?.get(jid);
            if (!lid) {
                try {
                    lid = await conn.lidMappingStore.getLIDForPN(jid);
                } catch {/* Jawa */}
            }
            if (lid) {
                out.add(lid);
                try {
                    cache?.set(jid, lid);
                    cache?.set(lid, jid);
                } catch {/* Jawa */}
            }
            if (lid) {
                let back = cache?.get(lid);
                if (!back) {
                    try {
                        back = await conn.lidMappingStore.getPNForLID(lid);
                    } catch {/* Jawa */}
                }
                if (back) {
                    out.add(back);
                    try {
                        cache?.set(lid, back);
                        cache?.set(back, lid);
                    } catch {/* Jawa */}
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
    const senderId = this.decodeJid(m.sender);
    const botId = this.decodeJid(this.user.id);
    const user =
        participants.find(
            (u) => this.decodeJid(u.lid) === senderId || this.decodeJid(u.id) === senderId
        ) || {};
    const bot =
        participants.find(
            (u) => this.decodeJid(u.lid) === botId || this.decodeJid(u.id) === botId
        ) || {};
    const isAdmin = user?.admin === "admin" || user?.admin === "superadmin";
    const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";

    if (isAdmin) return true;
    const chat = global.db.data.chats[m.chat];
    if (!chat?.antiLinks || !isBotAdmin) return true;

    const text =
        m.text ||
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption ||
        m.message?.buttonsResponseMessage?.selectedButtonId ||
        m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        "";
    if (!text) return true;

    if (linkRegex.test(text)) {
        try {
            await this.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.key.id,
                    participant: m.key.participant || m.sender,
                },
            });
        } catch {
            // Jawa
        }
    }

    return true;
}
