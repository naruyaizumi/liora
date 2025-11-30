import { convert } from "#add-on";
import { play } from "#play";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(`Please provide a song title.\n› Example: ${usedPrefix + command} Bye`);

    await global.loading(m, conn);
    try {
        const { success, title, channel, cover, url, downloadUrl, error } = await play(
            args.join(" ")
        );
        if (!success) throw new Error(error);

        const audioRes = await fetch(downloadUrl);
        if (!audioRes.ok) throw new Error(`Failed to fetch audio. Status: ${audioRes.status}`);

        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

        const converted = await convert(audioBuffer, {
            format: "opus",
            bitrate: "128k",
            channels: 1,
            sampleRate: 48000,
            ptt: true,
        });

        const finalBuffer =
            converted instanceof Buffer
                ? converted
                : converted?.buffer
                  ? Buffer.from(converted.buffer)
                  : converted?.data
                    ? Buffer.from(converted.data)
                    : Buffer.from(converted);

        await conn.sendMessage(
            m.chat,
            {
                audio: finalBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: channel,
                        thumbnailUrl: cover,
                        mediaUrl: url,
                        mediaType: 2,
                        renderLargerThumbnail: true,
                    },
                },
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

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;
