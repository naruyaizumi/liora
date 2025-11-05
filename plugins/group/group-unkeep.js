/* todo: Please use the appropriate modified Baileys fork, because the original Baileys does not support it.
let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("Reply a message to unkeep.");

    const quotedKey = m.quoted?.vM?.key;
    if (!quotedKey) return m.reply("Cannot unkeep: quoted message key not found");

    try {
        await conn.sendMessage(m.chat, {
            keep: quotedKey,
            type: 2,
        });
        m.reply("Message unmarked from keep.");
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["unkeep"];
handler.tags = ["group"];
handler.command = /^(unkeep)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
*/
