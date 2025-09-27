import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);

        let q = m.quoted ? m.quoted : m;
        let msg = q.msg || q;
        let mime = msg.mimetype || "";
        if (!mime) {
            await global.loading(m, conn, true);
            return m.reply(`🍡 *Balas pesan yang berisi file atau media ya sayang~*`);
        }

        let buffer = await q.download?.().catch(() => null);
        if (!buffer || !buffer.length) {
            await global.loading(m, conn, true);
            return m.reply(`🍩 *Gagal mengunduh media-nya yaa~*`);
        }

        let uploadedUrl = await uploader(buffer).catch(() => null);
        if (!uploadedUrl) {
            await global.loading(m, conn, true);
            return m.reply(`🧁 *Gagal mengunggah file ke Catbox.moe. Coba lagi nanti yaa~*`);
        }

        let resultText = `
🍓 *File berhasil diunggah!*
━━━━━━━━━━━━━━━━━━━
🍡 *Catbox.moe Uploader:*
*${uploadedUrl}*

🍩 *Ukuran File: ${(buffer.length / 1024).toFixed(2)} KB*
━━━━━━━━━━━━━━━━━━━
`.trim();

        await conn.sendMessage(
            m.chat,
            {
                text: resultText,
                footer: global.config.watermark,
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: `🍰 Salin Link`,
                            copy_code: uploadedUrl,
                        }),
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📂 Buka File",
                            url: uploadedUrl,
                            merchant_url: uploadedUrl,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`🍬 *Terjadi kesalahan!*\n🧁 *Detail:* ${e.message || e}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url)$/i;

export default handler;
