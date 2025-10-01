let handler = async (m, { conn, usedPrefix, command }) => {
    let bot = conn.user.jid;
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";
    if (/image/.test(mime)) {
        let img = await q.download();
        if (!img) return m.reply("Gambar tidak ditemukan");
        await conn.updateProfilePicture(bot, img);
        conn.reply(m.chat, "Sukses Mengganti Foto Profile Bot!", m);
    } else return m.reply(`kirim/balas gambar dengan caption *${usedPrefix + command}*`);
};

handler.help = ["setppbot"];
handler.tags = ["owner"];
handler.command = /^setpp(bot)?$/i;
handler.mods = true;

export default handler;
