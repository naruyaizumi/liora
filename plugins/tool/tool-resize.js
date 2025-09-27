let handler = async (m, { conn, args }) => {
    try {
        let towidth = parseInt(args[0]);
        let toheight = parseInt(args[1]);
        if (!towidth) return m.reply("🍓 *Masukkan ukuran width!*");
        if (!toheight) return m.reply("🍰 *Masukkan ukuran height!*");
        let q, mime;
        if (m.message?.imageMessage) {
            q = m.message.imageMessage;
            mime = q.mimetype;
        } else if (m.quoted) {
            q = m.quoted.msg || m.quoted;
            mime = q.mimetype || "";
        }
        if (!mime)
            return m.reply("🍩 *Media tidak ditemukan. Kirim/reply gambar yang ingin di-resize!*");
        if (!/image\/(jpe?g|png|webp)/.test(mime)) {
            return m.reply(`🧁 *Format ${mime} tidak didukung!*`);
        }
        await global.loading(m, conn);
        let file = await conn.downloadM(q, "image", false);
        if (!file || !file.length) return m.reply("🍪 *Gagal download media!*");
        let { buffer: resized, before, after } = await conn.resize(file, towidth, toheight);
        await conn.sendFile(
            m.chat,
            resized,
            "",
            `
🍬 *COMPRESS & RESIZE* 🍬
━━━━━━━━━━━━━━━━━━━
🍓 *Sebelum:*
🍧 *Lebar: ${before.width}px*
🍧 *Tinggi: ${before.height}px*
━━━━━━━━━━━━━━━━━━━
🧁 *Sesudah:*
🍦 *Lebar: ${after.width}px*
🍦 *Tinggi: ${after.height}px*
`.trim(),
            m
        );
    } catch (e) {
        console.error(e);
        await m.reply(`🍨 *Gagal resize:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["resize"];
handler.tags = ["tools"];
handler.command = /^(resize)$/i;

export default handler;
