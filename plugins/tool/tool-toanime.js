import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);
        let q = m.quoted ? m.quoted : m;
        let media = await q.download().catch(() => null);
        if (!media || !(media instanceof Buffer)) {
            return m.reply("⚠️ *Gagal mengunduh media atau format tidak dikenali.*");
        }
        let uploaded = await uploader(media).catch(() => null);
        if (!uploaded) return m.reply("⚠️ *Gagal mengunggah gambar. Coba lagi nanti!*");
        let api = global.API("btz", "/api/maker/jadianime", { url: uploaded }, "apikey");
        let res = await fetch(api);
        if (!res.ok) throw new Error("*Gagal menghubungi API.*");
        let json = await res.json();
        if (!json.status || !json.result || !json.result.img_1)
            throw new Error("*Gagal memproses gambar ke anime.*");
        let img1Url = json.result.img_1;
        let img2Url = json.result.img_2;
        await conn.sendMessage(
            m.chat,
            {
                image: { url: img1Url },
                caption: "✨ *Hasil pertama transformasi Anime berhasil!*",
            },
            { quoted: m }
        );
        if (img2Url) {
            await conn.sendMessage(
                m.chat,
                {
                    image: { url: img2Url },
                    caption: "✨ *Hasil kedua transformasi Anime berhasil!*",
                },
                { quoted: m }
            );
        }
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi kesalahan!*\n📌 *Detail:* ${e.message || e}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toanime"];
handler.tags = ["tools"];
handler.command = /^(toanime|animefy)$/i;

export default handler;
