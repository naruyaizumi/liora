let handler = async (m, { text, usedPrefix, command, conn }) => {
    try {
        if (text) {
            global.db.data.chats[m.chat].sBye = text;
            return m.reply("Bye message successfully updated.");
        }

        return m.reply(
            `Enter the goodbye message.\n› Example: ${usedPrefix + command} Goodbye @user\n\nAvailable placeholders:\n• @user = mention\n• @subject = group name`
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["setbye"];
handler.tags = ["group"];
handler.command = /^(setbye)$/i;
handler.group = true;
handler.owner = true;

export default handler;
