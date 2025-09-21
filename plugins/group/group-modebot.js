let handler = async (m, { text, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat];
    if (!text) {
        return m.reply(
            `🍩 *Status Bot Saat Ini:*\n*${chat.mute ? "🤫 Bot sedang offline" : "💬 Bot sedang online"}*`
        );
    }
    switch (text.toLowerCase()) {
        case "off":
        case "mute":
            if (chat.mute) return m.reply("⚠️ *Bot sudah dalam mode diam~*");
            chat.mute = true;
            m.reply("🌸 *Berhasil! Bot sekarang dalam mode diam.*");
            break;
        case "on":
        case "unmute":
            if (!chat.mute) return m.reply("⚠️ *Bot sudah aktif~* 💬");
            chat.mute = false;
            m.reply("🌸 *Berhasil! Bot aktif kembali ya~* 💬");
            break;
        default:
            m.reply(
                `❗ *Format salah!*\n\n💡 *Contoh: ${usedPrefix + command} on atau ${usedPrefix + command} off*`
            );
    }
};

handler.help = ["botmode"];
handler.tags = ["group"];
handler.command = /^(bot(mode)?)$/i;
handler.owner = true;

export default handler;
