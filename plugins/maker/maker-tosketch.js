import { uploader3 } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";
        if (!mime || !/image\/(jpeg|png)/.test(mime))
            return m.reply("Failed to download media or format not recognized.");
        await global.loading(m, conn);
        const media = await q.download();
        const uploaded = await uploader3(media);
        if (!uploaded) throw new Error("Failed to upload image. Please try again later.");

        const api = `https://api.nekolabs.my.id/tools/convert/tosketch?imageUrl=${encodeURIComponent(uploaded)}`;
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact API.");

        const json = await res.json();
        const img1Url = json.result;

        if (!img1Url) throw new Error("Failed to process image to sketch style.");

        await conn.sendMessage(
            m.chat,
            { image: { url: img1Url }, caption: "Sketch-style transformation result." },
            { quoted: m }
        );
    } catch (e) {
        m.reply(`An error occurred.\n${e.message || e}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tosketch"];
handler.tags = ["maker"];
handler.command = /^(tosketch)$/i;

export default handler;
