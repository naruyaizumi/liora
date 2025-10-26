/* todo: Please use the appropriate modified Baileys fork, because the original Baileys does not support it yet.
let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("Reply a message to unkeep.");

    const quotedMsg = m.quoted.copy();
    const { chat } = quotedMsg;

    try {
        await conn.sendMessage(chat, {
            keep: {
                type: 2,
                key: quotedMsg.key,
            },
        });
        m.reply("Message unkept successfully.");
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
