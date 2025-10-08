import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Enter a valid Google Drive link.\n› Example: ${usedPrefix + command} https://drive.google.com/file`
        );

    const url = args[0];
    if (!/^https?:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(url))
        return m.reply("Invalid URL! Please provide a valid Google Drive link.");

    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/download/gdrive", { url }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Request failed. HTTP ${res.status}`);

        const json = await res.json();
        if (!json.status || !json.result?.data)
            throw new Error("Failed to process Google Drive link.");

        const { data, fileName, mimetype } = json.result;
        await conn.sendFile(m.chat, data, fileName, null, m, false, {
            mimetype: mimetype || "application/octet-stream",
        });
    } catch (err) {
        console.error(err);
        m.reply(`Error: ${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["gdrive"];
handler.tags = ["downloader"];
handler.command = /^(gdrive|gdrivedl)$/i;

export default handler;
