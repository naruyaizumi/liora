let handler = async (m, { conn, usedPrefix, command }) => {
    if (!m.quoted || !/image/.test(m.quoted.mimetype))
        return m.reply(`🍙 *Balas atau kirim gambar dengan perintah: ${usedPrefix + command}`);
    try {
        let media = await m.quoted.download();
        await conn.updateProfilePicture(m.chat, media);
    } catch {
        m.reply("🍩 *Gagal memperbarui foto grup!*");
    }
};

handler.help = ["setppgc"];
handler.tags = ["group"];
handler.command = /^(setppgc)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
