import { fetch } from "liora-lib";

let handler = async (m, { conn, args }) => {
    try {
        await global.loading(m, conn);

        const q = m.quoted ?? m;
        const mime = (q.msg || q).mimetype || "";
        if (!mime || !/image\/(jpeg|png)/.test(mime))
            return m.reply("Only JPEG or PNG images are supported.");

        const media = await q.download();
        if (!media || !(media instanceof Buffer)) {
            return m.reply("Failed to download media or format not recognized.");
        }

        const uploaded = await uploader3(media);
        if (!uploaded) throw new Error("Failed to upload image.");

        const api = `https://api.nekolabs.my.id/canvas/brave-pink-hero-green?imageUrl=${encodeURIComponent(uploaded)}`;
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact BPHG API.");

        const buffer = Buffer.from(await res.arrayBuffer());

        await conn.sendMessage(
            m.chat,
            { image: buffer, caption: "Brave Pink Hero Green transformation result." },
            { quoted: m }
        );
    } catch (e) {
        m.reply("Error: " + e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bphg"];
handler.tags = ["maker"];
handler.command = /^(bphg)$/i;

export default handler;