let handler = async (m, { conn, usedPrefix, command }) => {
    const bot = conn.user.jid;
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!/image/.test(mime))
        return m.reply(`Send or reply an image with caption ${usedPrefix + command}`);

    try {
        const img = await q.download();
        if (!img) return m.reply("Failed to download image.");
        await conn.updateProfilePicture(bot, img);
        m.reply("Bot profile picture updated successfully.");
    } catch (e) {
        console.error(e);
        m.reply("Failed to update bot profile picture.");
    }
};

handler.help = ["setppbot"];
handler.tags = ["owner"];
handler.command = /^setpp(bot)?$/i;
handler.mods = true;

export default handler;
