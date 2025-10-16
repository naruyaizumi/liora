import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a MediaFire URL.\n› Example: ${usedPrefix + command} https://www.mediafire.com/file`
        );

    const url = args[0];
    if (!/^https:\/\/www\.mediafire\.com\/file\//i.test(url))
        return m.reply("Invalid URL! Please use a valid MediaFire link.");

    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/download/mediafire", { url }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Failed to contact API. Status: ${res.status}`);

        const json = await res.json();
        if (!json.status || !json.result?.download_url)
            throw new Error("Unable to retrieve file information from MediaFire.");

        const { filename, mimetype, download_url } = json.result;

        await conn.sendMessage(
            m.chat,
            {
                document: { url: download_url },
                fileName: filename,
                mimetype: mimetype || "application/octet-stream",
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        m.reply(`An error occurred: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["mediafire"];
handler.tags = ["downloader"];
handler.command = /^(mediafire|mf)$/i;

export default handler;
