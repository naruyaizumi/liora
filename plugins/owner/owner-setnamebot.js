let handler = async (m, { conn, text, command, usedPrefix }) => {
    if (!text)
        return m.reply(`*Contoh penggunaan:*\n${usedPrefix + command} Riselia Ray Crystalia`);
    try {
        await conn.updateProfileName(text);
        m.reply("*Berhasil mengubah nama bot!*");
    } catch (e) {
        console.error(e);
        m.reply(
            "⚠️ *Gagal mengubah nama. Pastikan koneksi stabil dan nama tidak terlalu panjang.*"
        );
    }
};

handler.help = ["setnamebot"];
handler.tags = ["owner"];
handler.command = /^set(name(bot)?)$/i;
handler.mods = true;

export default handler;
