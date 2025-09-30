import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : null;
        if (!q)
            return m.reply(
                `🍜 *Balas pesan yang berisi audio/video!*\n\n🍱 *Contoh:* ${usedPrefix + command} Judulnya apa nih?`
            );
        await global.loading(m, conn);
        let media = await q.download().catch(() => null);
        if (!media) return m.reply("🍩 *Gagal mengunduh media. Coba lagi!*");
        let url = await uploader(media).catch(() => null);
        if (!url) return m.reply("🍙 *Gagal upload file. Pastikan format audio/video benar.*");
        let apiUrl = global.API("btz", "/api/tools/whatmusic", { url }, "apikey");
        let res = await fetch(apiUrl);
        if (!res.ok) return m.reply("🍛 *Gagal menghubungi layanan BetaBotz. Coba lagi nanti!*");
        let json = await res.json();
        if (!json.status) return m.reply("🍣 *Lagu tidak terdeteksi!*");
        await m.reply(`🍔 *Hasil Deteksi Musik:*\n\n${json.result.trim()}`);
    } catch (e) {
        console.error(e);
        m.reply(`🍰 *Terjadi Kesalahan Teknis!*\n\n${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["whatmusic"];
handler.tags = ["tools"];
handler.command = /^(whatmusic|judul)$/i;

export default handler;
