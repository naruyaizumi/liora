import { addExif } from "../../src/bridge.js";

let handler = async (m, { conn, text }) => {
    const q = m.quoted ? m.quoted : m;
    if (!q || !/sticker|image|video/.test(q.mtype)) {
        return m.reply("🍡 *Balas stiker, gambar, atau video untuk diganti watermark!*");
    }

    let [packName, authorName] = (text || "").split("|");
    packName = (packName || global.config.stickpack || "").trim();
    authorName = (authorName || global.config.stickauth || "").trim();

    await global.loading(m, conn);
    try {
        const file = await conn.downloadM(q, "sticker", true);
        const buffer = Buffer.isBuffer(file) ? file : file?.data;

        if (!buffer) throw new Error("Buffer kosong, download gagal.");

        const result = await addExif(buffer, {
            packName,
            authorName,
            emojis: [],
        });

        await conn.sendFile(m.chat, result, "sticker.webp", "", m, false, {
            asSticker: true,
        });
    } catch (e) {
        console.error(e);
        m.reply(`🍰 *Ups, gagal pasang watermark!*\n📄 *Error:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["watermark"];
handler.tags = ["maker"];
handler.command = /^(wm|watermark)$/i;

export default handler;