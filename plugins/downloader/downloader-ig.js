import { fileTypeFromBuffer } from "file-type";
import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, usedPrefix, command, args }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid Instagram URL.\n› Example: ${usedPrefix + command} https://www.instagram.com/p/...`
        );

    const url = args[0];
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url))
        return m.reply("Invalid URL. Please send a proper Instagram link.");

    await global.loading(m, conn);

    try {
        const apiUrl = global.API("btz", "/api/download/igdowloader", { url }, "apikey");
        const json = await fetch(apiUrl).then((res) => res.json());

        if (!json.status || !json.message?.length)
            return m.reply("No media found for this Instagram link.");

        const sent = new Set();
        const album = [];

        for (const item of json.message) {
            if (!item._url || sent.has(item._url)) continue;
            sent.add(item._url);

            try {
                const res = await fetch(item._url);
                const buffer = Buffer.from(await res.arrayBuffer());
                const type = await fileTypeFromBuffer(buffer);
                if (!type) continue;

                if (type.mime.startsWith("image")) {
                    album.push({
                        image: buffer,
                        caption: null,
                    });
                } else if (type.mime.startsWith("video")) {
                    album.push({
                        video: buffer,
                        caption: null,
                    });
                }
            } catch (err) {
                console.error("Error analyzing media:", item._url, err);
            }
        }

        if (!album.length) return m.reply("No valid media files were found.");
        if (album.length === 1) {
            const media = album[0];
            const type = media.image ? "image" : "video";
            await conn.sendFile(m.chat, media[type], "", null, m, false, {
                mimetype: media.mime,
            });
        } else {
            await conn.sendMessage(m.chat, { album }, { quoted: m });
        }
    } catch (err) {
        console.error(err);
        await m.reply("An error occurred while fetching from Instagram. Please try again later.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["instagram"];
handler.tags = ["downloader"];
handler.command = /^(instagram|ig|igdl)$/i;

export default handler;