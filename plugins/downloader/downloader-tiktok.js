import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url)
        return m.reply(`Please provide a valid TikTok URL.\n› Example: ${usedPrefix + command} https://vt.tiktok.com`);
    if (!/^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url))
        return m.reply("Invalid URL! Please provide a valid TikTok link.");

    await global.loading(m, conn);
    try {
        const res = await fetch(`https://api.nekolabs.my.id/downloader/tiktok?url=${url}`);
        const json = await res.json();
        if (!json?.status) throw new Error("Invalid API response.");

        const { videoUrl, images } = json.result || {};

        if (videoUrl) {
            await conn.sendMessage(m.chat, { video: { url: videoUrl }, mimetype: "video/mp4" }, { quoted: m });
        } else if (Array.isArray(images) && images.length) {
            const album = images.map((img, i) => ({
                image: { url: img },
                caption: `Slide ${i + 1} of ${images.length}`,
            }));
            await conn.sendAlbum(m.chat, album, { quoted: m });
        } else m.reply("No downloadable media found.");
    } catch (err) {
        console.error(err);
        m.reply(`Error: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;