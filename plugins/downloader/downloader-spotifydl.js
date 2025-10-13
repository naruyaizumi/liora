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

        const { title, artist, thumbnail, url } = json.result.data;

        await conn.sendFile(m.chat, url, `${title}.mp3`, null, m, true, {
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title,
                    body: artist?.name || "Spotify",
                    thumbnailUrl: thumbnail,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        });
    } catch (err) {
        console.error(err);
        m.reply(`An error occurred: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotifydl"];
handler.tags = ["downloader"];
handler.command = /^(spotifydl|spdl)$/i;

export default handler;
