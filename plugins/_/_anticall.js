export async function before(m, { conn }) {
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
                } catch {}
            }
            if (lid) {
                out.add(lid);
                try {
                    cache?.set(jid, lid);
                    cache?.set(lid, jid);
                } catch {}
            }
            if (lid) {
                let back = cache?.get(lid);
                if (!back) {
                    try {
                        back = await conn.lidMappingStore.getPNForLID(lid);
                    } catch {}
                }
                if (back) {
                    out.add(back);
                    try {
                        cache?.set(lid, back);
                        cache?.set(back, lid);
                    } catch {}
                }
            }
        }
        return [...out];
    };

    const devOwners = global.config.owner.filter(([n, , isDev]) => n && isDev);
    const regOwners = global.config.owner.filter(([n, , isDev]) => n && !isDev);
    const devList = await resolveOwners(conn, devOwners);
    const regList = await resolveOwners(conn, regOwners);
    const isMods = devList.includes(m.sender);
    const isOwner = m.fromMe || isMods || regList.includes(m.sender);
    if (isOwner || isMods) return true;

    conn.ev.on("call", async (call) => {
        const settings = global.db.data.settings?.[conn.user.jid];
        if (!settings) return;
        if (call[0].status === "offer" && settings.anticall) {
            const caller = call[0].from;
            try {
                await conn.rejectCall(call[0].id, caller);
                await conn.updateBlockStatus(caller, "block");
            } catch (e) {
                console.error(e);
            }
        }
    });

    return true;
}