import {
    uploader,
    uploader2,
    uploader3,
    uploader4,
    uploader5,
    uploader6,
    uploader7,
    uploader8,
} from "../../lib/uploader.js";

const uploaders = {
    1: { name: "🍡 Catbox.moe", fn: uploader },
    2: { name: "🍪 Uguu.se", fn: uploader2 },
    3: { name: "🍰 Qu.ax", fn: uploader3 },
    4: { name: "🌸 Put.icu", fn: uploader4 },
    5: { name: "🍫 Tmpfiles", fn: uploader5 },
    6: { name: "🧋 Betabotz", fn: uploader6 },
    7: { name: "🍵 Yupra CDN", fn: uploader7 },
    8: { name: "🧁 CloudkuImages", fn: uploader8 },
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0] || isNaN(args[0]) || !uploaders[args[0]]) {
            let list = Object.entries(uploaders)
                .map(([num, { name }]) => `*${num}. ${name}*`)
                .join("\n");

            return m.reply(
                `🍡 *Pilih server upload dengan angka:*
*${usedPrefix + command} <nomor>*

🍰 *Daftar server:*
${list}`
            );
        }

        let server = uploaders[args[0]];
        if (!server) return m.reply(`🍩 *Server tidak valid!*`);

        let q = m.quoted ? m.quoted : m;
        let msg = q.msg || q;
        let mime = msg.mimetype || "";
        if (!mime) {
            return m.reply(`🍡 *Balas pesan yang berisi file atau media*`);
        }
        
        await global.loading(m, conn);
        let buffer = await q.download?.().catch(() => null);
        if (!buffer || !buffer.length) {
            return m.reply(`🍩 *Gagal mengunduh media-nya yaa~*`);
        }

        let url = await server.fn(buffer).catch(() => null);
        if (!url) {
            return m.reply(`🧁 *Gagal mengunggah file ke ${server.name}*`);
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `*${server.name}*\n📎 *URL berhasil dibuat!*`,
                title: "🍰 Upload Success",
                footer: global.config.watermark,
                hasMediaAttachment: false,
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin URL",
                            copy_code: url,
                        }),
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🌐 Buka URL",
                            url: url,
                            merchant_url: url,
                        }),
                    },
                ],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`🍬 *Terjadi kesalahan!*\n🧁 ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url)$/i;

export default handler;
