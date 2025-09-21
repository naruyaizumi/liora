import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);
        let q = m.quoted ? m.quoted : m;
        let media = await q.download().catch(() => null);
        if (!media || !(media instanceof Buffer)) {
            return m.reply("⚠️ *Gagal mengunduh media atau format tidak dikenali.*");
        }
        let url = await uploader(media).catch(() => null);
        if (!url) return m.reply("⚠️ *Gagal mengunggah gambar. Coba lagi nanti!*");
        let api = global.API("btz", "/api/tools/recolor", { url }, "apikey");
        let res = await fetch(api);
        if (!res.ok) throw "Gagal memproses gambar.";
        let json = await res.json();
        if (!json.status || !json.result) throw "Gagal mendapatkan hasil dari server.";
        await conn.sendMessage(
            m.chat,
            {
                image: { url: json.result },
                caption: "🎨 *Warna gambar berhasil direkonstruksi (Recolor)*",
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi kesalahan!*\n📌 *Detail:* ${e.message || e}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["recolor"];
handler.tags = ["tools"];
handler.command = /^(recolor)$/i;

export default handler;
