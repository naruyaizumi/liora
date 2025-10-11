import { fetch } from "../../src/bridge.js";

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

    const headers = { "X-API-Key": global.config.ytdl };
    await global.loading(m, conn);

    try {
        const apiUrl = `https://cloudkutube.eu/ytmp3?url=${url}&buffer=true`;
        const res = await fetch(apiUrl, { headers });
        if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`);

        const buffer = Buffer.from(await res.arrayBuffer());

        await conn.sendFile(m.chat, buffer, `audio_${Date.now()}.mp3`, null, m, false, {
            mimetype: "audio/mpeg",
        });
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
