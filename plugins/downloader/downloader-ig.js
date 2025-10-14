import { fetch } from "liora-lib";

let handler = async (m, { conn, usedPrefix, command, args }) => {
    if (!args[0]) {
        return m.reply(
            `Usage: ${usedPrefix + command} <instagram_url>\nExample: › ${usedPrefix + command} https://www.instagram.com/p/...`
        );
    }
    const url = args[0].trim();
    if (/^https?:\/\/(www\.)?instagram\.com\/stories\//i.test(url)) {
        return m.reply("Instagram Story URLs are not supported.");
    }
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
        return m.reply("Invalid URL. Please provide a valid Instagram link.");
    }
    try {
        await global.loading(m, conn);
        const apiUrl = `https://api.nekolabs.my.id/downloader/instagram?url=${url}`;
        const json = await fetch(apiUrl).then((res) => res.json());
        if (!json.success || !json.result) {
            return m.reply("No media found or the post may be private.");
        }
        const result = json.result;
        const album = [];
        if (result.metadata?.isVideo) {
            const videoUrls = result.url || result.downloadUrl || [];
            for (const link of videoUrls) {
                album.push({ type: "video", url: link });
            }
        } else if (Array.isArray(result.downloadUrl)) {
            for (const link of result.downloadUrl) {
                album.push({ type: "image", url: link });
            }
        }
        if (album.length === 0) {
            return m.reply("No valid media files found.");
        }
        if (album.length === 1) {
            const item = album[0];
            const message =
                item.type === "image" ? { image: { url: item.url } } : { video: { url: item.url } };
            await conn.sendMessage(m.chat, message, { quoted: m });
            return;
        }
        const albumItems = album.map((item, index) =>
            item.type === "image"
                ? { image: { url: item.url }, caption: `Slide ${index + 1}` }
                : { video: { url: item.url }, caption: `Slide ${index + 1}` }
        );

        await conn.sendMessage(m.chat, { album: albumItems }, { quoted: m });
    } catch (err) {
        console.error("[Instagram DL Error]", err);
        m.reply("An error occurred while fetching data from Instagram. Try again later.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["instagram"];
handler.tags = ["downloader"];
handler.command = /^(instagram|ig|igdl)$/i;

export default handler;
