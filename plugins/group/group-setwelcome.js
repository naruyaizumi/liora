let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        let chat = global.db.data.chats[m.chat];
        if (!chat) chat = global.db.data.chats[m.chat] = {};

        if (!text) {
            if (chat.sWelcome) {
                chat.sWelcome = "";
                m.reply(
                    "Welcome message has been reset.\nNo active greeting message in this group."
                );
            } else {
                m.reply(
                    `Enter the welcome text.\n› Example: ${usedPrefix + command} Hello @user, welcome to @subject\n\nAvailable placeholders:\n• @user = mention\n• @subject = group name\n• @desc = group description`
                );
            }
        }

        chat.sWelcome = text;
        m.reply("Welcome message successfully updated.");
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["setwelcome"];
handler.tags = ["group"];
handler.command = /^(setwelcome|setw)$/i;
handler.group = true;
handler.admin = true;

export default handler;
