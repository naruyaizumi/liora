let handler = async (m, { text, usedPrefix, command, conn }) => {
    try {
        const chat = global.db.data.chats[m.chat];

        if (!text) {
            const status = chat.mute ? "OFFLINE" : "ONLINE";
            return m.reply(
                `Bot status: ${status}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off' to change mode.`
            );
        }

        switch (text.toLowerCase()) {
            case "off":
            case "mute":
                if (chat.mute) return m.reply("Bot is already OFFLINE.");
                chat.mute = true;
                return m.reply("Bot is now OFFLINE.");

            case "on":
            case "unmute":
                if (!chat.mute) return m.reply("Bot is already ONLINE.");
                chat.mute = false;
                return m.reply("Bot is now ONLINE.");

            default:
                return m.reply(`Invalid parameter.\nUsage: ${usedPrefix + command} on | off`);
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["botmode"];
handler.tags = ["group"];
handler.command = /^(bot(mode)?)$/i;
handler.owner = true;

export default handler;
