import { fetch, convert } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(`Please provide a song title.\n› Example: ${usedPrefix + command} Mata Air`);

    await global.loading(m, conn);
    try {
        const res = await fetch(
            "https://api.nekolabs.my.id/downloader/youtube/play/v1?q=" +
                encodeURIComponent(args.join(" ").trim())
        );
        const json = await res.json();
        if (!json.success || !json.result?.downloadUrl)
            return m.reply("Failed to retrieve the requested YouTube track.");

        const { title, channel, duration, cover, url } = json.result.metadata;

        const audioRes = await fetch(json.result.downloadUrl);
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
                        body: `${channel} • ${duration}`,
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
        console.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;