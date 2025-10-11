let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("No quoted message found to delete.");

    const { chat, id, participant, sender } = m.quoted;
    const quotedSender = participant || sender;

    if (
        global.config.owner.some(([num]) => quotedSender.includes(num)) ||
        (global.mods && global.mods.includes(quotedSender))
    ) {
        return m.reply("Cannot delete message from Owner or Developer.");
    }

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
        console.error(e);
        return m.reply(
            "Failed to delete message — it may already be gone or not belong to another user."
        );
    }
};

handler.help = ["delete"];
handler.tags = ["group"];
handler.command = /^(d|delete)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
