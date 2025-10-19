import { uploader } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.mimetype || q.mediaType || "").toLowerCase();

        if (!/webp/.test(mime))
            return m.reply(`Reply a sticker with the command: ${usedPrefix + command}`);

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!buffer || !Buffer.isBuffer(buffer))
            throw new Error("Failed to download sticker buffer.");

        const url = await uploader(buffer);
        if (!url) throw new Error("Failed to upload sticker.");

        const apiUrl = global.API("btz", "/api/tools/webp2mp4", { url }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Failed to process sticker via API.");

        const json = await res.json();
        const result = json.result || json.url;
        if (!result) throw new Error("No video result returned.");

        await conn.sendMessage(
            m.chat,
            {
                video: { url: result },
                caption: "Sticker successfully converted to video.",
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`Conversion failed.\nError: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tovideo"];
handler.tags = ["maker"];
handler.command = /^(tovideo)$/i;

export default handler;
