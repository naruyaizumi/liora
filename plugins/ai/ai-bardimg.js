import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";
        if (!mime)
            return m.reply(
                `🍩 *Balas atau kirim gambar dengan caption!*\n\n🍬 *Contoh: ${usedPrefix + command} Jelaskan isi gambar ini!*`
            );
        await global.loading(m, conn);
        let media = await q.download();
        if (!media) return m.reply("🍫 *Gagal mengunduh gambar. Pastikan koneksi stabil ya~*");
        let linkUpload = await uploader(media).catch(() => null);
        if (!linkUpload) return m.reply("🍪 *Gagal mengunggah gambar. Coba lagi nanti ya~*");
        if (!text)
            return m.reply(
                `🍰 *Masukkan teks untuk analisis gambar!*\n\n🍡 *Contoh: ${usedPrefix + command} Jelaskan gambar ini!*`
            );
        let apiUrl = global.API("btz", "/api/search/bard-img", { url: linkUpload, text }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok)
            return m.reply(
                "🍱 *Gagal memproses gambar melalui Bard AI. Coba beberapa saat lagi ya~*"
            );
        let json = await response.json();
        let resultText = String(json?.result ?? "🍙 *Bard tidak bisa memahami gambar ini!*");
        await conn.sendMessage(
            m.chat,
            {
                text: `🖼️ *Bard AI (Image)*\n🍯 *Prompt: ${text}*\n\n🍬 *Hasil:*\n${resultText}`,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi Kesalahan Teknis!*\n🍡 *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bardimg"];
handler.tags = ["ai"];
handler.command = /^(bardimg|bardimage)$/i;
handler.premium = true;

export default handler;
