import { uploader, uploader2, uploader3 } from "../../lib/uploader.js";

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

        let catbox = await uploader(buffer).catch(() => null);
        let uguu = await uploader2(buffer).catch(() => null);
        let quax = await uploader3(buffer).catch(() => null);

        if (!catbox && !uguu && !quax) {
            await global.loading(m, conn, true);
            return m.reply(`🧁 *Gagal mengunggah file ke semua server. Coba lagi nanti yaa~*`);
        }

        let resultText = `
🍓 *File berhasil diunggah!*
━━━━━━━━━━━━━━━━━━━
${catbox ? `🍡 *Catbox.moe: ${catbox}*` : ""}
${uguu ? `🍪 *Uguu.se: ${uguu}*` : ""}
${quax ? `🍰 *Qu.ax: ${quax}*\n` : ""}
━━━━━━━━━━━━━━━━━━━
🍦 *Ukuran File: ${(buffer.length / 1024).toFixed(2)} KB*
━━━━━━━━━━━━━━━━━━━
`.trim();

        let buttons = [];
        if (catbox) {
            buttons.push({
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: `🍡 Salin Catbox`,
                    copy_code: catbox,
                }),
            });
        }
        if (uguu) {
            buttons.push({
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: `🍪 Salin Uguu`,
                    copy_code: uguu,
                }),
            });
        }
        if (quax) {
            buttons.push({
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: `🍰 Salin Qu.ax`,
                    copy_code: quax,
                }),
            });
        }

        await conn.sendMessage(
            m.chat,
            {
                text: resultText,
                footer: global.config.watermark,
                interactiveButtons: buttons,
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