import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        await global.loading(m, conn);

        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";

        if (!mime)
            return m.reply(
                `🍩 *Balas atau kirim gambar dengan caption!*\n\n🍬 *Contoh: ${usedPrefix + command}*`
            );

        if (!/image\/(jpeg|png|jpg)/.test(mime))
            return m.reply("🍪 *Format gambar tidak didukung! Gunakan JPG atau PNG.*");

        let media = await q.download().catch(() => null);
        if (!media) return m.reply("🍫 *Gagal mengunduh gambar! Pastikan file tidak rusak.*");

        let uploaded = await uploader(media).catch(() => null);
        if (!uploaded) return m.reply("🍰 *Gagal mengunggah gambar. Coba lagi nanti!*");

        let apiUrl = global.API(
            "btz",
            "/api/maker/jadipixar",
            { url: uploaded },
            "apikey"
        );

        let response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Gagal memproses gambar ke gaya Pixar!");

        let buffer = Buffer.from(await response.arrayBuffer());

        await conn.sendMessage(
            m.chat,
            {
                image: buffer,
                caption: `🍡 *Berhasil mengubah gambar jadi gaya Pixar!*`,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`🍬 *Terjadi Kesalahan Teknis!*\n🍭 *Detail:* ${e.message || e}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["topixar"];
handler.tags = ["maker"];
handler.command = /^(topixar|jadipixar)$/i;

export default handler;