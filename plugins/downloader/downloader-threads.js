import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url)
        return m.reply(
            `Please provide a valid Threads URL.\n› Example: ${usedPrefix + command} https://www.threads.net`
        );

    await global.loading(m, conn);

    try {
        const res = await fetch(
            `https://api.nekolabs.web.id/downloader/threads?url=${encodeURIComponent(url)}`
        );
        if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.result) throw new Error("Invalid API response.");

        const result = json.result;

        // ambil resolusi tertinggi (elemen terakhir dari tiap sub-array)
        const extractImages = (data) => {
            if (!Array.isArray(data)) return [];
            return data
                .map((group) => {
                    if (Array.isArray(group) && group.length > 0) {
                        const best = group[group.length - 1];
                        return best?.url_cdn || best?.url;
                    }
                    return null;
                })
                .filter(Boolean);
        };

        const extractVideos = (data) => {
            if (!Array.isArray(data)) return [];
            return data
                .map((group) => {
                    if (Array.isArray(group) && group.length > 0) {
                        const best = group[group.length - 1];
                        return best?.url_cdn || best?.url;
                    }
                    return null;
                })
                .filter(Boolean);
        };

        const images = extractImages(result.images);
        const videos = extractVideos(result.videos);

        if (videos.length > 0) {
            const videoUrl = videos[videos.length - 1];
            await conn.sendMessage(
                m.chat,
                { video: { url: videoUrl }, caption: result.text || result.caption || "" },
                { quoted: m }
            );
        } else if (images.length > 0) {
            if (images.length === 1) {
                await conn.sendMessage(
                    m.chat,
                    { image: { url: images[0] }, caption: result.text || result.caption || "" },
                    { quoted: m }
                );
            } else {
                const album = images.map((img, i) => ({
                    image: { url: img },
                    caption: `Slide ${i + 1} of ${images.length}`,
                }));
                await conn.sendAlbum(m.chat, album, { quoted: m });
            }
        } else {
            throw new Error("No media found in this Threads post.");
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["threads"];
handler.tags = ["downloader"];
handler.command = /^(threads)$/i;

export default handler;
