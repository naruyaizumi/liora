import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";
        if (!/webp/.test(mime))
            return m.reply(`🍙 *Balas stiker dengan perintah:* \`${usedPrefix + command}\``);
        await global.loading(m, conn);
        let buffer = await q.download();
        let url = await uploader(buffer);
        if (!url) return m.reply("🍜 *Gagal mengunggah stiker!*");
        let apiUrl = global.API("btz", "/api/tools/webp2mp4", { url }, "apikey");
        let res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`🍡 *Gagal memproses dengan API!*`);
        let json = await res.json();
        let result = json.result || json.url || null;
        if (!result) throw new Error("🍩 *Tidak ada hasil video!*");
        await conn.sendFile(
            m.chat,
            result,
            "tovideo.mp4",
            "🍱 *Berhasil mengonversi stiker ke video!*",
            m
        );
    } catch (e) {
        console.error(e);
        m.reply(`🍧 *Gagal mengonversi stiker ke video!*\n🍵 ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tovideo"];
handler.tags = ["maker"];
handler.command = /^(tovideo)$/i;

export default handler;
