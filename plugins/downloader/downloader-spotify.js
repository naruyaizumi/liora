import { spotify } from "#spotify";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(`Please provide a song title.\n› Example: ${usedPrefix + command} Swim`);

    await global.loading(m, conn);
    
    try {
        const { success, title, channel, cover, url, downloadUrl, error } = await spotify(
            args.join(" ")
        );
        if (!success) throw new Error(error);

        const audioRes = await fetch(downloadUrl);
        if (!audioRes.ok) throw new Error(`Failed to fetch audio. Status: ${audioRes.status}`);

        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

        await conn.sendFile(
            m.chat,
            audioBuffer,
            "audio.opus",
            "",
            m,
            true,
            {
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: channel,
                        thumbnailUrl: cover,
                        mediaUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotify"];
handler.tags = ["downloader"];
handler.command = /^(spotify)$/i;

export default handler;