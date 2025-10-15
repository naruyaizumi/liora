let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("No quoted message found to delete.");
    const { chat, id, participant, sender } = m.quoted;
    const quotedSender = participant || sender;
    if (!quotedSender) return m.reply("Could not identify quoted sender.");
    const pn = await conn.lidMappingStore.getPNForLID(quotedSender).catch(() => null);
    const senderPN = pn || quotedSender;

    const isOwner =
        Array.isArray(global.config?.owner) &&
        global.config.owner.some(([num]) => senderPN.includes(num));
    const isMod =
        Array.isArray(global.mods) &&
        global.mods.some(num => senderPN.includes(num));

    if (isOwner || isMod)
        return m.reply("Cannot delete message from Owner or Developer.");

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
        return m.reply("Failed to delete message — it may already be gone or not belong to another user.");
    }
};

handler.help = ["delete"];
handler.tags = ["group"];
handler.command = /^(d|delete)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;