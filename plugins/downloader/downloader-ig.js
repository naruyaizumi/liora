import { instagram } from "#instagram";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url)
        return m.reply(
            `Please provide a valid Instagram link.\n› Example: ${usedPrefix + command} https://www.instagram.com/p/...`
        );

    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url))
        return m.reply("Invalid URL. Please provide a proper Instagram link.");
    if (/\/stories\//i.test(url))
        return m.reply("Instagram stories are not supported. Please provide a post or reel URL.");

    await global.loading(m, conn);

    try {
        const { success, type, urls, error } = await instagram(url);
        if (!success) throw new Error(error || "Failed to fetch media.");

        if (type === "video") {
            await conn.sendMessage(
                m.chat,
                { video: { url: urls[0] }, mimetype: "video/mp4" },
                { quoted: m }
            );
        } else if (type === "images") {
            if (urls.length === 1) {
                await conn.sendMessage(m.chat, { image: { url: urls[0] } }, { quoted: m });
            } else {
                const album = urls.map((img, i) => ({
                    image: { url: img },
                    caption: `Slide ${i + 1} of ${urls.length}`,
                }));
                await conn.sendAlbum(m.chat, album, { quoted: m });
            }
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["instagram"];
handler.tags = ["downloader"];
handler.command = /^(instagram|ig)$/i;

export default handler;
