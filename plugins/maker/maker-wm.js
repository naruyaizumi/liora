import { sticker, addExif, mp4ToWebp } from "../lib/sticker.js";

let handler = async (m, { conn, text }) => {
    let q = m.quoted ? m.quoted : m;
    if (!q || !/sticker|image|video/.test(q.mtype))
        return m.reply("🍡 *Balas gambar, stiker, atau video untuk diberi watermark!*");
    let [packname, author] = (text || "").split("|");
    packname = packname || global.config.stickpack;
    author = author || global.config.stickauth;
    await global.loading(m, conn);
    try {
        let mime = q.mimetype || "";
        let media = await q.download();
        let result;
        if (/webp/.test(mime)) {
            let isAnimated = media.toString("utf8").includes("ANIM");
            result = isAnimated
                ? await addExif(media, packname, author)
                : await sticker(media, packname, author);
        } else if (/image/.test(mime)) {
            result = await sticker(media, packname, author);
        } else if (/video/.test(mime)) {
            if ((q.msg || q).seconds > 30) return m.reply("⚠️ *Maksimal durasi video 30 detik!*");
            let webp = await mp4ToWebp(media, { pack: packname, author });
            result = await addExif(webp, packname, author);
        } else {
            return m.reply("⚠️ *Tipe media tidak didukung!*");
        }
        await conn.sendFile(m.chat, result, "sticker.webp", "", m);
    } catch (e) {
        console.error(e);
        m.reply("🍰 *Ups! Gagal pasang watermark ke media!* ✨");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["watermark"];
handler.tags = ["maker"];
handler.command = /^(wm|watermark)$/i;
handler.premium = true;

export default handler;
