import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";
        if (!/webp/.test(mime))
            return m.reply(`🍙 *Balas stiker dengan perintah* \`${usedPrefix + command}\``);
        await global.loading(m, conn);
        let buffer = await q.download();
        let url = await uploader(buffer);
        if (!url) return m.reply("🍤 *Gagal mengunggah stiker!*");
        let apiUrl = global.API("btz", "/api/tools/webp2png", { url }, "apikey");
        let res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`🍜 *Gagal memproses dengan API!*`);
        let json = await res.json();
        let result = json.result || json.url || null;
        if (!result) throw new Error("🍩 *Tidak ada hasil gambar!*");
        await conn.sendFile(
            m.chat,
            result,
            "toimg.png",
            "🍱 *Berhasil mengonversi stiker ke gambar!*",
            m
        );
    } catch (e) {
        console.error(e);
        m.reply(`🥟 *Gagal mengonversi stiker ke gambar!*\n🍧 ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toimg"];
handler.tags = ["maker"];
handler.command = /^(toimg)$/i;

export default handler;
