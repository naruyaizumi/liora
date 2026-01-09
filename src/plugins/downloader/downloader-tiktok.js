import { tiktok } from "#api/tiktok.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) {
        return m.reply(`Need TikTok URL\nEx: ${usedPrefix + command} https://vt.tiktok.com/xxx`);
    }

    if (!/^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url)) {
        return m.reply("Invalid TikTok URL");
    }

    await global.loading(m, conn);

    try {
        const { success, type, images, videoUrl, error } = await tiktok(url);
        if (!success) throw new Error(error || "Failed");

        if (type === "images") {
            if (images.length === 1) {
                await conn.sendMessage(m.chat, { image: { url: images[0] } }, { quoted: m });
            } else {
                const album = images.map((img, i) => ({
                    image: { url: img },
                    caption: `${i + 1}/${images.length}`,
                }));
                await conn.client(m.chat, album, { quoted: m });
            }
        } else if (type === "video") {
            await conn.sendMessage(
                m.chat,
                { video: { url: videoUrl }, mimetype: "video/mp4" },
                { quoted: m }
            );
        }
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;
