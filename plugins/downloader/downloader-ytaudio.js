import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid YouTube or YouTube Music link.\n› Example: ${usedPrefix + command} https://music.youtube.com`
        );

    const url = args[0];
    const youtubeRegex =
        /^(https?:\/\/)?((www|m|music)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!youtubeRegex.test(url))
        return m.reply("Invalid URL! Please provide a valid YouTube or YouTube Music link.");

    await global.loading(m, conn);

    try {
        const apiUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.result?.downloadUrl)
            return m.reply("Failed to process request. Please try again later.");

        await conn.sendMessage(
            m.chat,
            {
                audio: { url: json.result.downloadUrl },
                mimetype: "audio/mpeg",
                fileName: `${json.result.title || "track"}.mp3`,
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

handler.help = ["ytmp3"];
handler.tags = ["downloader"];
handler.command = /^(ytmp3)$/i;

export default handler;