let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("No quoted message found to delete.");
    const { chat, id, participant, sender, fromMe } = m.quoted;
    if (m.isBaileys || m.fromMe) return true;
    const quotedSender = participant || sender;
    if (!quotedSender) return m.reply("Could not identify quoted sender.");
    if (fromMe) return m.reply("Cannot delete messages sent by the bot.");
    try {
        await conn.sendMessage(chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id,
                participant: quotedSender,
            },
        });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["delete"];
handler.tags = ["group"];
handler.command = /^(d|delete)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
