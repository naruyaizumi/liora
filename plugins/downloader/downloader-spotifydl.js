import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0] || !args[0].startsWith("http"))
        return m.reply(
            `Please provide a valid Spotify track URL.\n› Example: ${usedPrefix + command} https://open.spotify.com`
        );

    await global.loading(m, conn);

    try {
        const apiUrl = `https://api.nekolabs.web.id/downloader/spotify/v1?url=${encodeURIComponent(args[0])}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Failed to contact API. Status: ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.result?.downloadUrl)
            throw new Error("Failed to process Spotify track.");
        const { downloadUrl } = json.result;

        await conn.sendMessage(
            m.chat,
            {
                audio: { url: downloadUrl },
                mimetype: "audio/mpeg",
                fileName: "spotify.mp3",
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotifydl"];
handler.tags = ["downloader"];
handler.command = /^(spotifydl)$/i;

export default handler;
