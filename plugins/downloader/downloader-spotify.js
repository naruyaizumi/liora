import { convert } from "#add-on";
import { spotify } from "#spotify";
import { spotifyCanvas } from "../../lib/canvas-spotify.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(`Please provide a song title.\n› Example: ${usedPrefix + command} Swim`);

    await global.loading(m, conn);
    try {
        const { success, title, channel, cover, url, downloadUrl, duration, error } = await spotify(
            args.join(" ")
        );
        if (!success) throw new Error(error);

        const canvasBuffer = await spotifyCanvas(cover, title, channel, duration);

        const audioRes = await fetch(downloadUrl);
        if (!audioRes.ok) throw new Error(`Failed to fetch audio. Status: ${audioRes.status}`);

        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

        const converted = await convert(audioBuffer, {
            format: "opus",
            bitrate: "128k",
            channels: 1,
            sampleRate: 48000,
            ptt: false,
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
                        thumbnail: canvasBuffer,
                        mediaUrl: url,
                        mediaType: 1,
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

handler.help = ["spotify"];
handler.tags = ["downloader"];
handler.command = /^(spotify|sp)$/i;

export default handler;