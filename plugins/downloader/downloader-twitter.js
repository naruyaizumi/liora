import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid Twitter/X URL.\n› Example: ${usedPrefix + command} https://x.com`
        );
    const url = args[0];
    await global.loading(m, conn);
    try {
        const apiUrl = `https://api.nekolabs.web.id/downloader/twitter?url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.result?.media?.length)
            throw new Error("Unable to process this Twitter/X URL.");
        const { media } = json.result;
        for (const item of media) {
            if (item.type === "photo") {
                const photos = media.filter(m => m.type === "photo").map(m => m.url);
                if (photos.length === 1) {
                    await conn.sendMessage(m.chat, { image: { url: photos[0] }, caption: null }, { quoted: m });
                } else if (photos.length > 1) {
                    const album = photos.map((img, i) => ({
                        image: { url: img },
                        caption: `Slide ${i + 1} of ${photos.length}`,
                    }));
                    await conn.sendAlbum(m.chat, album, { quoted: m });
                }
                break;
            } else if (item.type === "video" && Array.isArray(item.variants) && item.variants.length) {
                const high = item.variants[item.variants.length - 1];
                await conn.sendMessage(
                    m.chat,
                    {
                        video: { url: high.url },
                        caption: `Resolution: ${high.resolution}`,
                        fileName: `twitter.mp4`,
                    },
                    { quoted: m }
                );
                break;
            }
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["twitter"];
handler.tags = ["downloader"];
handler.command = /^(twitter)$/i;

export default handler;