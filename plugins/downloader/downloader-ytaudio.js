import { fetch, convert } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid YouTube video link.\n› Example: ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ`
        );

    const url = args[0];
    const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!youtubeRegex.test(url))
        return m.reply("Invalid URL! Please provide a valid YouTube video link.");

    await global.loading(m, conn);

    try {
        const apiUrl = global.API("btz", "/api/download/ytmp3", { url }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`);
        const json = await res.json();
        if (!json.status || !json.result?.mp3)
            return m.reply("Failed to process request. Please try again later.");
        const { title, mp3, thumb, source } = json.result;
        const audioRes = await fetch(mp3);
        if (!audioRes.ok)
            throw new Error(`Failed to fetch audio file. Status: ${audioRes.status}`);
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
        const converted = convert(audioBuffer, {
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
                        title: title,
                        body: "YouTube Music",
                        mediaUrl: source,
                        mediaType: 2,
                        thumbnailUrl: thumb,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        m.reply(`Error while downloading: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytmp3"];
handler.tags = ["downloader"];
handler.command = /^(ytmp3)$/i;

export default handler;