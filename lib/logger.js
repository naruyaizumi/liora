export default async function (m, conn = { user: {} }) {
    try {
        if (global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
        if (!m || !m.sender || !m.chat || !m.mtype) return;
        const sender = conn.decodeJid(m.sender);
        const chat = conn.decodeJid(m.chat);
        const user = (await conn.getName(sender)) || "Unknown";
        const msg = m.text || "";
        if (!/^[/!.]/.test(msg)) return;
        const cmd = msg.split(" ")[0] || "No command";
        const getIdFormat = (id) => {
            if (id?.endsWith("@lid")) return "LID";
            if (id?.endsWith("@s.whatsapp.net")) return "PN";
            if (id?.startsWith("@")) return "Username";
            return "Unknown";
        };
        const getChatContext = (id) => {
            if (id?.endsWith("@g.us")) return "Group";
            if (id?.endsWith("@broadcast")) return "Broadcast";
            if (id?.endsWith("@newsletter")) return "Channel";
            if (id?.endsWith("@lid") || id?.endsWith("@s.whatsapp.net")) return "Private";
            return "Unknown";
        };
        const idFormat = getIdFormat(sender);
        const chatContext = getChatContext(chat);
        conn.logger.info(`${cmd} — ${user}`);
        conn.logger.debug(`↳ ${sender} [${idFormat}]`);
        conn.logger.debug(`↳ [${chatContext}]`);
    } catch (e) {
        conn.logger.error(e);
    }
}
