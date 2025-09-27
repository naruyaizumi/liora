import sharp from "sharp";

let handler = async (m, { conn }) => {
    let q, mime;
    if (m.message?.imageMessage) {
        q = m.message.imageMessage;
        mime = q.mimetype;
    } else if (m.quoted) {
        q = m.quoted.msg || m.quoted;
        mime = q.mimetype || "";
    }

    if (!mime || !/image\/(jpe?g|png|webp)/.test(mime)) {
        return m.reply("🍓 *Kirim/reply gambar yang ingin dicek resolusinya!*");
    }

    try {
        let buffer = await q.download?.().catch(() => null);
        if (!buffer || !buffer.length) {
            return m.reply("🍩 *Gagal mengunduh media!*");
        }

        let { width, height } = await sharp(buffer).metadata();
        let result = `
🍬 *CEK RESOLUSI GAMBAR* 🍬
━━━━━━━━━━━━━━━━━━━
🧁 *Ukuran: ${width} × ${height} px*
🍦 *Ukuran file: ${(buffer.length / 1024).toFixed(2)} KB*
━━━━━━━━━━━━━━━━━━━
`.trim();

        await conn.sendFile(m.chat, buffer, "", result, m);
    } catch (e) {
        console.error(e);
        m.reply(`🍡 *Gagal membaca resolusi gambar.*\n\n${e.message}`);
    }
};

handler.help = ["cekresolution"];
handler.tags = ["tools"];
handler.command = /^(cekreso(lution)?)$/i;

export default handler;
