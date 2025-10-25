export default async function (m, conn = { user: {} }) {
    try {
        if (global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
        if (!m || !m.sender || !m.chat || !m.mtype) return;
        let pn = m.sender.replace(/[^0-9]/g, "");
        let user = (await conn.getName(m.sender)) || "Unknown";
        let msg = m.text || "";
        if (!/^[/!.]/.test(msg)) return;
        let cmd = msg.split(" ")[0] || "No command";
        let type = m.chat.endsWith("@g.us")
            ? "Group"
            : m.chat.endsWith("@s.whatsapp.net")
              ? "Private"
              : m.chat.endsWith("@broadcast")
                ? "Broadcast"
                : m.chat.endsWith("@newsletter")
                  ? "Channel"
                  : "Unknown";
        const id = m.sender.endsWith("@lid") ? "LID" : "JID";

        conn.logger.info(`${cmd} — ${user}`);
        conn.logger.debug(`↳ ${pn} [${id}]`);
        conn.logger.debug(`↳ [${type}]`);
    } catch (e) {
        conn.logger.error(e);
    }
}
