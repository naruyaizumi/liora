import { fetch } from "liora-lib";

let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("Please provide a valid YouTube video link.");
    const url = args[0];
    const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!youtubeRegex.test(url))
        return m.reply("Invalid URL! Please provide a valid YouTube link.");

    await global.loading(m, conn);

    try {
        const res = await fetch(global.API("btz", "/api/download/ytmp4", { url }, "apikey"));
        if (!res.ok) throw new Error(`Failed to contact API. Status: ${res.status}`);

        const json = await res.json();
        if (!json.status || !json.result?.mp4)
            throw new Error("Failed to process YouTube video. Please try again.");

        const { mp4, title } = json.result;

        await conn.sendMessage(
            m.chat,
            {
                video: { url: mp4 },
                caption: title,
                mimetype: "video/mp4",
                fileName: `${title}.mp4`,
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        m.reply(`Error: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytmp4"];
handler.tags = ["downloader"];
handler.command = /^(ytmp4)$/i;

export default handler;