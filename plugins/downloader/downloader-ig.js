import { fileTypeFromBuffer } from "file-type";
import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url)
        return m.reply(`Please provide a valid Instagram URL.\n› Example: ${usedPrefix + command} https://www.instagram.com/p/...`);
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url))
        return m.reply("Invalid URL. Please send a proper Instagram link.");

    await global.loading(m, conn);
    try {
        const json = await fetch(global.API("btz", "/api/download/igdowloader", { url }, "apikey")).then(r => r.json());
        if (!json.status || !json.message?.length) return m.reply("No media found.");

        const album = [];
        let video = null;

        for (const i of json.message) {
            if (!i._url) continue;
            const res = await fetch(i._url);
            const buf = Buffer.from(await res.arrayBuffer());
            const type = await fileTypeFromBuffer(buf);
            if (!type) continue;

            if (type.mime.startsWith("image")) album.push({ image: buf, filename: `ig_${Date.now()}.jpg`, mime: type.mime });
            else if (type.mime.startsWith("video")) video = { video: buf, filename: `ig_${Date.now()}.mp4`, mime: type.mime };
        }

        if (video) {
            await conn.sendMessage(m.chat, { video: video.video, mimetype: video.mime, fileName: video.filename }, { quoted: m });
        } else if (album.length) {
            await conn.sendAlbum(m.chat, album, { quoted: m });
        } else m.reply("No valid media files found.");
    } catch (err) {
        console.error(err);
        m.reply(`Error: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["instagram"];
handler.tags = ["downloader"];
handler.command = /^(instagram|ig|igdl)$/i;

export default handler;