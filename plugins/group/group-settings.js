let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const arg = (args[0] || "").toLowerCase();
        const isClose = { open: "not_announcement", close: "announcement" }[arg];

        if (isClose === undefined) {
            return m.reply(
                `Usage: ${usedPrefix + command} open | close\n\nopen  → allow members to send messages\nclose → only admins can send messages`
            );
        }

        await conn.groupSettingUpdate(m.chat, isClose);

        const status =
            arg === "open" ? "Group opened (members can chat)" : "Group closed (admins only)";
        return m.reply(`Status: ${status}`);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
