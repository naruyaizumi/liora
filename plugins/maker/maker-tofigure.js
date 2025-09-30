import { uploader3 } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";

        if (!/image/.test(mime)) {
            return m.reply(
                `🖼️ *Balas atau kirim gambar dengan caption!*\n📌 *Contoh: ${usedPrefix + command}*`
            );
        }

        await global.loading(m, conn);

        let media = await q.download();
        if (!media) return m.reply("❌ *Gagal mengunduh gambar!*");
        let imageUrl = await uploader3(media).catch(() => null);

        if (!imageUrl) return m.reply("🍪 *Gagal mengunggah gambar ke uploader5!*");

        let apiUrl = `https://api.nekolabs.my.id/tools/convert/tofigure?imageUrl=${imageUrl}`;
        let res = await fetch(apiUrl);
        if (!res.ok) return m.reply(`❌ *API error:* ${res.statusText}`);

        let json = await res.json();
        if (!json.status || !json.result)
            return m.reply("🍩 *Gagal membuat figure dari gambar ini!*");

        await conn.sendMessage(
            m.chat,
            {
                image: { url: json.result },
                caption: `✨ *Berhasil dibuat Figure!*`,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi kesalahan:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tofigure"];
handler.tags = ["maker"];
handler.command = /^(tofigure)$/i;

export default handler;
