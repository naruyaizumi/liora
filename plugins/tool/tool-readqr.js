import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";
        if (!/image/.test(mime))
            return m.reply(
                `🥐 *Balas gambar dengan perintah ${usedPrefix + command} atau kirim gambar pakai caption ya~*`
            );
        await global.loading(m, conn);
        let media = await q.download();
        if (!media) return m.reply("🍰 *Gagal unduh gambarnya*");
        let url = await uploader(media).catch(() => null);
        if (!url) return m.reply("🍮 *Gagal upload gambarnya ke server~*");
        let res = await fetch(global.API("btz", "/api/tools/decode-qr", { url }, "apikey"));
        if (!res.ok) throw new Error(`🍫 *Gagal proses QR! Status:* ${res.status}`);
        let json = await res.json();
        if (!json?.status || !json?.result) return m.reply("🍜 *QR tidak bisa dibaca yaa~*");
        let hasilQR = json.result.trim();
        let textResult = `🍡 *Hasil Scan QR Code:*\n\n\`\`\`${hasilQR}\`\`\`\n\n📋 *Klik tombol di bawah untuk salin teks ini!*`;
        await conn.sendMessage(
            m.chat,
            {
                image: { url },
                caption: textResult,
                footer: global.config.watermark,
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍩 Salin QR Result",
                            copy_code: hasilQR,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`🍔 *Gagal proses QR Code!*\n${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["readqr"];
handler.tags = ["tools"];
handler.command = /^(readqr|decode)$/i;

export default handler;
