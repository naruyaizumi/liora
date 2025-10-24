let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("Reply a message to keep.");

    const quotedMsg = m.quoted.copy();
    const { chat } = quotedMsg;

    try {
        await conn.sendMessage(chat, {
            keep: {
                type: 1,
                key: quotedMsg.key,
            },
        });
        m.reply("Message marked as keep.");
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["keep"];
handler.tags = ["group"];
handler.command = /^(keep)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
