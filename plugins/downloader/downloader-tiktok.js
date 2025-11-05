import { tiktok } from "#tiktok";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url)
        return m.reply(
            `Please provide a valid TikTok link.\n› Example: ${usedPrefix + command} https://vt.tiktok.com`
        );
    if (!/^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url))
        return m.reply("Invalid URL. Please provide a proper TikTok link.");

    await global.loading(m, conn);

    try {
        const { success, type, images, videoUrl, error } = await tiktok(url);
        if (!success) throw new Error(error || "Failed to fetch media.");

        if (type === "images") {
            if (images.length === 1) {
                await conn.sendMessage(m.chat, { image: { url: images[0] } }, { quoted: m });
            } else {
                const album = images.map((img, i) => ({
                    image: { url: img },
                    caption: `Slide ${i + 1} of ${images.length}`,
                }));
                await conn.sendAlbum(m.chat, album, { quoted: m });
            }
        } else if (type === "video") {
            await conn.sendMessage(
                m.chat,
                { video: { url: videoUrl }, mimetype: "video/mp4" },
                { quoted: m }
            );
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;
