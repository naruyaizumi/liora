import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, text }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";
        let imageUrl = text;
        if (!text && !/image\/(jpeg|jpg|png|webp)/.test(mime))
            return m.reply("Failed to download media or format not recognized.");
        await global.loading(m, conn);
        if (/image\/(jpeg|jpg|png|webp)/.test(mime)) {
            const media = await q.download();
            const uploaded = await uploader(media);
            imageUrl = uploaded.url || uploaded;
        }

        if (!imageUrl) return m.reply("Failed to upload image or invalid input.");

        const api = `https://zelapioffciall.koyeb.app/imagecreator/toanime?url=${encodeURIComponent(imageUrl)}`;
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact API.");

        const buffer = Buffer.from(await res.arrayBuffer());

        await conn.sendMessage(
            m.chat,
            { image: buffer, caption: "Anime transformation result." },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toanime"];
handler.tags = ["maker"];
handler.command = /^(toanime)$/i;

export default handler;
