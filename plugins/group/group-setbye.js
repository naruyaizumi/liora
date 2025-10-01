let handler = async (m, { text, usedPrefix, command }) => {
    if (text) {
        global.db.data.chats[m.chat].sBye = text;
        m.reply(`🍰 *Pesan bye berhasil diatur!*`);
    } else {
        return m.reply(
            `🍩 *Teksnya mana?*\n\n🍬 *Contoh penggunaan: ${usedPrefix + command} Selamat tinggal 🍙 @user*`
        );
    }
};

handler.help = ["setbye"];
handler.tags = ["group"];
handler.command = /^(setbye)$/i;
handler.group = true;
handler.owner = true;

export default handler;
