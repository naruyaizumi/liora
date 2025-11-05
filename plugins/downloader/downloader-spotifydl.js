import { spotifydl } from "#spotifydl";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid Spotify track URL.\n› Example: ${usedPrefix + command} https://open.spotify.com/track/...`
        );

    const url = args[0];
    const spotifyRegex = /^https?:\/\/open\.spotify\.com\/track\/[\w-]+(\?.*)?$/i;
    if (!spotifyRegex.test(url))
        return m.reply("Invalid URL! Please provide a valid Spotify track link.");

    await global.loading(m, conn);

    try {
        const { success, downloadUrl, error } = await spotifydl(url);
        if (!success) throw new Error(error);

        await conn.sendMessage(
            m.chat,
            {
                audio: { url: downloadUrl },
                mimetype: "audio/mpeg",
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
