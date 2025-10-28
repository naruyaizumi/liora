import { uploader } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, command, usedPrefix }) => {
    const q = m.quoted && m.quoted.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!q || typeof q.download !== "function" || !/image\/(jpe?g|png|webp)/i.test(mime)) {
        return m.reply(
            `Please send or reply to an image before using this command.\nExample: : ${usedPrefix}${command} < reply to image or ${usedPrefix}${command} < send image with caption`
        );
    }

    try {
        await global.loading(m, conn);

        const img = await q.download().catch(() => null);
        if (!img) return;

        const url = await uploader(img).catch(() => null);
        if (!url) return;

        const encoded = encodeURIComponent(url);
        const base = "https://api.nekolabs.web.id/tools/remove-bg";
        const versions = ["v1", "v2", "v3", "v4"];

        let resultUrl = null;
        let successVersion = null;

        for (const version of versions) {
            const endpoint = `${base}/${version}?imageUrl=${encoded}`;
            const res = await fetch(endpoint).catch(() => null);
            const json = await res?.json().catch(() => null);
            if (json?.success && json?.result) {
                resultUrl = json.result;
                successVersion = version;
                break;
            }
        }

        if (!resultUrl) throw new Error("All background removal attempts failed.");

        await conn.sendMessage(
            m.chat,
            {
                image: { url: resultUrl },
                caption: `Background removed using ${successVersion.toUpperCase()}.`,
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["removebg"];
handler.tags = ["tools"];
handler.command = /^(removebg)$/i;

export default handler;
