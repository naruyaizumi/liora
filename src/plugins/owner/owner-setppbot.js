let handler = async (m, { conn, usedPrefix, command }) => {
    const bot = conn.decodeJid(conn.user.id);
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";

    if (!/image/.test(mime)) return m.reply(`Send/reply image\nEx: ${usedPrefix + command}`);

    const img = await q.download();
    if (!img) return m.reply("Failed");

    await conn.updateProfilePicture(bot, img);
    m.reply("PP updated");
};

handler.help = ["setppbot"];
handler.tags = ["owner"];
handler.command = /^setpp(bot)?$/i;
handler.owner = true;

export default handler;
