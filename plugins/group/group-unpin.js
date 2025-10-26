/* todo: Please use the appropriate modified Baileys fork, because the original Baileys does not support it yet.
let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("Reply a message to unpin.");

    const quotedMsg = m.quoted.copy();
    const { chat } = quotedMsg;

    try {
        await conn.sendMessage(chat, {
            pin: {
                type: 0,
                key: quotedMsg.key,
            },
        });
        m.reply("Message unpinned successfully.");
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
*/
