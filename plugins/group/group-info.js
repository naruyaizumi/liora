let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);
        const chat = conn.chats[m.chat];
        const row = conn[Symbol.for("liora.store.db")]
            ?.prepare("SELECT data FROM groups WHERE id = ?")
            ?.get(m.chat);
        const meta = chat?.metadata || (row ? row.data : null);
        const groupMeta = typeof meta === "string" ? JSON.parse(meta) : meta || {};

        const participants = groupMeta.participants || [];
        const groupAdmins = participants.filter((p) => p.admin);
        const owner =
            groupMeta.owner ||
            groupAdmins.find((p) => p.admin === "superadmin")?.id ||
            m.chat.split`-`[0] + "@s.whatsapp.net";

        const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split("@")[0]}`).join("\n");
        const sWelcome = global.db.data.chats[m.chat]?.sWelcome || "(none)";
        const sBye = global.db.data.chats[m.chat]?.sBye || "(none)";
        const desc = groupMeta.desc?.toString() || "(none)";

        const text = `
Group Info
Group ID: ${m.chat}
Name: ${groupMeta.subject || chat?.subject || "(unknown)"}
Members: ${participants.length}
Owner: @${owner.split("@")[0]}

Admins:
${listAdmin || "-"}

Welcome Msg: ${sWelcome}
Leave Msg: ${sBye}

Description:
${desc}
        `.trim();

        await conn.sendMessage(m.chat, {
            text,
            mentions: [...groupAdmins.map((v) => v.id), owner],
        });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["infogrup"];
handler.tags = ["group"];
handler.command = /^(gro?upinfo|info(gro?up|gc))$/i;
handler.group = true;
handler.admin = true;

export default handler;
