import { uploader } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted && m.quoted.mimetype ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";

        if (!/image\/(jpe?g|png)/i.test(mime))
            return m.reply(`Send or reply to an image.\n› Example: ${usedPrefix + command}`);

        await global.loading(m, conn);

        const img = await q.download();
        if (!img) return m.reply("Failed to download the image.");

        const url = await uploader(img).catch(() => null);
        if (!url) return m.reply("Failed to upload image to server.");

        const api = global.API("btz", "/api/tools/removebg", { url }, "apikey");
        const res = await fetch(api);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const json = await res.json();
        if (!json.status || !json.url) throw new Error("Failed to remove background.");

        await conn.sendMessage(
            m.chat,
            {
                image: { url: json.url },
                caption: "Background removed successfully.",
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

handler.help = ["removebg"];
handler.tags = ["tools"];
handler.command = /^(removebg)$/i;

export default handler;
