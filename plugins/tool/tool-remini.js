import { uploader3 } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, command, usedPrefix }) => {
    const q = m.quoted && m.quoted.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!q || typeof q.download !== "function" || !/image\/(jpe?g|png|webp)/i.test(mime)) {
        return m.reply(
            `Please send or reply to an image before using this command.\nExample: ${usedPrefix}${command} < reply to image or ${usedPrefix}${command} < send image with caption`
        );
    }

    try {
        await global.loading(m, conn);

        const media = await q.download().catch(() => null);
        if (!media || !(media instanceof Buffer)) return;

        const url = await uploader3(media).catch(() => null);
        if (!url) return;

        const encoded = encodeURIComponent(url);
        const attempts = [
            { name: "ihancer", url: `https://api.nekolabs.web.id/tools/ihancer?imageUrl=${encoded}=high` },
            { name: "pxpic upscale", url: `https://api.nekolabs.web.id/tools/pxpic/upscale?imageUrl=${encoded}` },
            { name: "Real-ESRGAN v1 (scale 5)", url: `https://api.nekolabs.web.id/tools/real-esrgan/v1?imageUrl=${encoded}&scale=5` },
            { name: "Real-ESRGAN v1 (scale 10)", url: `https://api.nekolabs.web.id/tools/real-esrgan/v1?imageUrl=${encoded}&scale=10` },
            { name: "Real-ESRGAN v2 (scale 5)", url: `https://api.nekolabs.web.id/tools/real-esrgan/v2?imageUrl=${encoded}&scale=5` },
            { name: "Real-ESRGAN v2 (scale 10)", url: `https://api.nekolabs.web.id/tools/real-esrgan/v2?imageUrl=${encoded}&scale=10` },
        ];

        let resultUrl = null;
        let methodUsed = null;

        for (const attempt of attempts) {
            const res = await fetch(attempt.url).catch(() => null);
            const json = await res?.json().catch(() => null);
            if (json?.success && json?.result) {
                resultUrl = json.result;
                methodUsed = attempt.name;
                break;
            }
        }

        if (!resultUrl) throw new Error("All enhancement methods failed.");

        await conn.sendMessage(
            m.chat,
            {
                image: { url: resultUrl },
                caption: `Enhanced using: ${methodUsed}`,
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["hd"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;