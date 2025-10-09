import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, usedPrefix, command, args }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid TikTok URL.\n› Example: ${usedPrefix + command} https://vt.tiktok.com`
        );

    const url = args[0];
    if (!/^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url))
        return m.reply("Invalid URL! Please provide a valid TikTok link.");

    await global.loading(m, conn);

    try {
        const res = await fetch(`https://api.nekolabs.my.id/downloader/tiktok?url=${url}`);
        const json = await res.json();
        if (!json?.status) throw new Error("Invalid response from Nekolabs API");

        const { videoUrl, images } = json.result || {};

        if (videoUrl) {
            await conn.sendFile(m.chat, videoUrl, "tiktok.mp4", null, m);
        } else if (Array.isArray(images) && images.length) {
            const slides = images.map((img, i) => ({
                image: { url: img },
                caption: `Slide ${i + 1} of ${images.length}`,
            }));
            await conn.sendMessage(m.chat, { album: slides }, { quoted: m });
        } else {
            await m.reply("No media found for this TikTok link.");
        }
    } catch (e) {
        console.error(e);
        await m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;