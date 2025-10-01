import { sticker } from "../../lib/sticker.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";
        if (!mime && !args[0]) {
            return m.reply(
                `🍚 *Reply/kirim gambar, gif, atau video dengan perintah* ${usedPrefix + command}`
            );
        }

        await global.loading(m, conn);

        let file;
        if (args[0] && isUrl(args[0])) {
            file = await conn.getFile(args[0], true);
        } else {
            let media = await q.download?.();
            if (!media) return m.reply("🍩 *Gagal download media!*");
            file = await conn.getFile(media, true);
        }

        let buff = await sticker(file, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendFile(m.chat, buff, "sticker.webp", "", m, false, { asSticker: true });
    } catch (e) {
        console.error(e);
        await m.reply("❌ *Gagal membuat stiker:* " + e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["sticker"];
handler.tags = ["maker"];
handler.command = /^s(tic?ker)?(gif)?$/i;

export default handler;

const isUrl = (text) => /^https?:\/\/.+\.(jpe?g|png|gif|mp4)$/i.test(text);
