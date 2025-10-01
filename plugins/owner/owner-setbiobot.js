let handler = async (m, { conn, text, command, usedPrefix }) => {
    if (!text)
        return m.reply(
            `*Contoh penggunaan:*\n${usedPrefix + command} Aku adalah bot terbaik milik Izumi.`
        );
    try {
        await conn.setStatus(text);
        m.reply("*Berhasil mengubah bio WhatsApp bot!*");
    } catch (e) {
        console.error(e);
        m.reply("⚠️ *Gagal mengubah bio. Coba lagi nanti atau periksa koneksi.*");
    }
};

handler.help = ["setbiobot"];
handler.tags = ["owner"];
handler.command = /^set(bio(bot)?)$/i;
handler.mods = true;

export default handler;
