import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (args.length < 2)
        return m.reply(
            `Please specify the format and YouTube video link.\n› Example: ${usedPrefix + command} 720 https://youtu.be\n\nAvailable formats: 144, 240, 360, 480, 720, 1080`
        );

    const format = args[0];
    const url = args[1];
    const validFormats = ["144", "240", "360", "480", "720", "1080"];
    if (!validFormats.includes(format))
        return m.reply(`Invalid format.\nAvailable formats: ${validFormats.join(", ")}`);

    const youtubeRegex =
        /^(https?:\/\/)?((www|m)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!youtubeRegex.test(url))
        return m.reply("Invalid URL. Only standard YouTube video links are supported.");

    await global.loading(m, conn);

    try {
        const apiUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(
            url
        )}&format=${encodeURIComponent(format)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.result?.downloadUrl)
            throw new Error("Failed to process the video. Please try again later.");
        if (json.result.type !== "video")
            throw new Error("This link appears to contain audio content only. Use .ytmp3 instead.");

        const { title, downloadUrl, quality } = json.result;

        await conn.sendMessage(
            m.chat,
            {
                video: { url: downloadUrl },
                caption: `${title}\nQuality: ${quality}p`,
                mimetype: "video/mp4",
                fileName: `${title}-${quality}p.mp4`,
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

handler.help = ["ytmp4"];
handler.tags = ["downloader"];
handler.command = /^(ytmp4)$/i;

export default handler;
