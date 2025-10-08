import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a song title to search on Spotify.\n› Example: ${usedPrefix + command} Swim`
        );

    const query = args.join(" ");
    await global.loading(m, conn);

    try {
        const res = await fetch(
            `https://api.nekolabs.my.id/downloader/spotify/play/v1?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json.status || !json.result?.downloadUrl)
            return m.reply("Failed to find or download the requested Spotify track.");

        const { title, artist, duration, cover } = json.result.metadata;
        const audioUrl = json.result.downloadUrl;

        await conn.sendFile(m.chat, audioUrl, `${title}.mp3`, null, m, true, {
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title,
                    body: `${artist} • ${duration}`,
                    thumbnailUrl: cover,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        });
    } catch (err) {
        console.error(err);
        m.reply(`An error occurred while fetching Spotify data: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotify"];
handler.tags = ["downloader"];
handler.command = /^(spotify)$/i;

export default handler;
