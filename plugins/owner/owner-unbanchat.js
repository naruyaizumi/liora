let handler = async (m, { args }) => {
    let id = args[0] ? args[0] : m.chat;
    let chat = global.db.data.chats[id];
    if (!chat.isBanned) return m.reply("🍩 *Grup ini tidak sedang dibanned kok, sayang~*");
    if (chat.isBannedTime > 0) chat.isBannedTime = 0;
    chat.isBanned = false;
    m.reply("🧁 *Berhasil unban group ini, makasih sayang~*");
};

handler.help = ["unbanchat"];
handler.tags = ["owner"];
handler.command = /^(unbanchat|ubnc)$/i;
handler.owner = true;

export default handler;
