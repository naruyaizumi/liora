let handler = async (m, { text, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat];
    if (!chat) chat = global.db.data.chats[m.chat] = {};
    if (!text) {
        if (chat.sWelcome) {
            chat.sWelcome = "";
            return m.reply(
                "🍩 *Pesan welcome telah di-reset!* 🍰\n*Sekarang nggak ada pesan sambutan khusus di grup ini~*"
            );
        } else {
            return m.reply(
                `🍓 *Teks welcome-nya mana* 🍮\n\n*Contoh: ${usedPrefix + command} Hai, @user! 🍭 Selamat datang di @subject* 🍬\n\n*Gunakan: • @user = mention*\n*• @subject = nama grup*\n*• @desc = deskripsi grup*`
            );
        }
    }
    chat.sWelcome = text;
    return m.reply("🍰 *Welcome berhasil diatur!* 🍓");
};

handler.help = ["setwelcome"];
handler.tags = ["group"];
handler.command = /^(setwelcome|setw)$/i;
handler.group = true;
handler.admin = true;

export default handler;
