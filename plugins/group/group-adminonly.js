let handler = async (m, { text, usedPrefix, command, conn }) => {
    try {
        const chat = global.db.data.chats[m.chat];

        if (!text) {
            const status = chat.adminOnly ? "ADMIN-ONLY" : "ALL MEMBERS";
            return m.reply(
                `Admin-only mode: ${status}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off' to change access.`
            );
        }

        switch (text.toLowerCase()) {
            case "on":
            case "enable":
                if (chat.adminOnly) return m.reply("Admin-only mode is already ENABLED.");
                chat.adminOnly = true;
                return m.reply("Admin-only mode is now ENABLED. Only admins can use bot features.");

            case "off":
            case "disable":
                if (!chat.adminOnly) return m.reply("Admin-only mode is already DISABLED.");
                chat.adminOnly = false;
                return m.reply(
                    "Admin-only mode is now DISABLED. All members can use bot features."
                );

            default:
                return m.reply(`Invalid parameter.\nUsage: ${usedPrefix + command} on | off`);
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["adminonly"];
handler.tags = ["group"];
handler.command = /^(adminonly)$/i;
handler.admin = true;
handler.group = true;

export default handler;
