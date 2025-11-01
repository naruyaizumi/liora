/* todo: Please use the appropriate modified Baileys fork, because the original Baileys does not support it.
let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("Reply a message to keep.");

    const quotedKey = m.quoted?.vM?.key;
    if (!quotedKey) return m.reply("Cannot keep: quoted message key not found");

    try {
        await conn.sendMessage(m.chat, {
            keep: quotedKey,
            type: 1,
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
*/