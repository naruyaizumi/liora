import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid Pinterest URL.\n› Example: ${usedPrefix + command} https://www.pinterest.com/pin`
        );

    const url = args[0];

    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/download/pinterest", { url }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Failed to contact API. Status: ${res.status}`);

        const json = await res.json();
        if (!json.result?.data)
            throw new Error("Unable to process request. Please check the URL and try again.");

        const { media_type, image, video } = json.result.data;

        if (media_type === "image" && image) {
            await conn.sendMessage(m.chat, { image: { url: image } }, { quoted: m });
        } else if (media_type?.startsWith("video") && video) {
            await conn.sendMessage(m.chat, { video: { url: video } }, { quoted: m });
        } else {
            return m.reply("No downloadable media found in this URL.");
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["pinterestdl"];
handler.tags = ["downloader"];
handler.command = /^(pindl|pinterestdl)$/i;

export default handler;
