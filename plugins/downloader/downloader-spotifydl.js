import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0] || !args[0].startsWith("http"))
        return m.reply(
            `Please provide a valid Spotify track URL.\n› Example: ${usedPrefix + command} https://open.spotify.com/track/...`
        );
    await global.loading(m, conn);
    try {
        const res = await fetch(
            global.API("btz", "/api/download/spotify", { url: args[0] }, "apikey")
        );
        if (!res.ok) throw new Error(`Failed to contact API. Status: ${res.status}`);
        const json = await res.json();
        if (!json.status || !json.result?.data?.url)
            throw new Error("Failed to download track from Spotify.");
        const { title, url } = json.result.data;
        await conn.sendMessage(
            m.chat,
            {
                audio: { url },
                mimetype: "audio/mpeg",
                fileName: `${title || "spotify_track"}.mp3`,
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        m.reply(`Error: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotifydl"];
handler.tags = ["downloader"];
handler.command = /^(spotifydl|spdl)$/i;

export default handler;
