import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url)
        return m.reply(
            `Please provide a valid Instagram URL.\n› Example: ${usedPrefix + command} https://www.instagram.com`
        );

    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url))
        return m.reply("Invalid URL. Please send a proper Instagram link.");
    if (/\/stories\//i.test(url))
        return m.reply("Instagram stories are not supported. Please provide a post or reel URL.");

    await global.loading(m, conn);
    try {
        const res = await fetch(
            `https://api.nekolabs.web.id/downloader/instagram?url=${encodeURIComponent(url)}`
        );
        if (!res.ok) throw new Error(`Failed to contact API. Status: ${res.status}`);
        const json = await res.json();

        if (!json.success || !json.result) return m.reply("No media found.");

        const data = json.result;
        const mediaUrls = data.url || data.downloadUrl || [];
        const urls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];

        if (!urls.length) return m.reply("No downloadable media found.");

        if (data.metadata?.isVideo) {
            await conn.sendMessage(
                m.chat,
                {
                    video: { url: urls[0] },
                    caption: null,
                    fileName: "instagram.mp4",
                },
                { quoted: m }
            );
        } else {
            const album = urls.map((u, i) => ({
                image: { url: u },
                fileName: `${data.metadata?.username || "instagram"}_${i + 1}.jpg`,
            }));
            await conn.sendAlbum(m.chat, album, {
                quoted: m,
                caption: null,
            });
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
