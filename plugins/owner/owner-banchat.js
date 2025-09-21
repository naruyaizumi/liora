let handler = async (m, { args }) => {
    let id = args[1] ? args[1] : m.chat;
    let chat = global.db.data.chats[id];
    if (args[0]) {
        if (isNaN(args[0])) return m.reply("🍭 *Hanya Angka Ya Sayang!*");
        let jumlahHari = 86400000 * args[0];
        let now = new Date() * 1;
        if (now < chat.isBannedTime) chat.isBannedTime += jumlahHari;
        else chat.isBannedTime = now + jumlahHari;
        chat.isBanned = true;
        m.reply(`🍬 *Grup ini telah dibanned selama ${args[0]} hari!*`);
    } else {
        chat.isBannedTime = 999;
        chat.isBanned = true;
        m.reply("🍓 *Grup ini berhasil dibanned secara permanen yaa~*");
    }
};

handler.help = ["banchat"];
handler.tags = ["owner"];
handler.command = /^(ban(chat|gc))$/i;
handler.owner = true;

export default handler;
