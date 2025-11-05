let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("Reply a message to unpin.");

    const quotedKey = m.quoted?.vM?.key;
    if (!quotedKey) return m.reply("Cannot unpin: quoted message key not found");

    try {
        await conn.sendMessage(m.chat, {
            pin: quotedKey,
            type: 2,
        });
        m.reply(`Message unpinned.`);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["unpin"];
handler.tags = ["group"];
handler.command = /^(unpin)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
