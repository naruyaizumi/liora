import { sticker } from "#add-on";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime && !args[0])
            return m.reply(
                `Send or reply with an image, GIF, or video using: ${usedPrefix + command}`
            );

        await global.loading(m, conn);

        let buffer;
        if (args[0] && isUrl(args[0])) {
            const res = await fetch(args[0]);
            if (!res.ok) throw new Error("Failed to fetch file from URL.");
            buffer = Buffer.from(await res.arrayBuffer());
        } else {
            const media = await q.download?.();
            if (!media) return m.reply("Failed to download media.");
            buffer = Buffer.isBuffer(media) ? media : media.data ? Buffer.from(media.data) : null;
        }

        if (!buffer) throw new Error("Empty buffer. File could not be processed.");

        const opts = {
            crop: false,
            quality: 90,
            fps: 30,
            maxDuration: 10,
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
            emojis: [],
        };

        let result = await sticker(buffer, opts);
        const maxSize = 1024 * 1024;
        let step = 0;

        while (result.length > maxSize && step < 4) {
            step++;
            opts.quality -= 10;
            if (opts.quality < 50) opts.quality = 50;
            if (step >= 2) opts.fps = Math.max(8, opts.fps - 2);
            result = await sticker(buffer, opts);
        }

        await conn.sendMessage(m.chat, { sticker: result }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["sticker"];
handler.tags = ["maker"];
handler.command = /^(s(tic?ker)?)$/i;

export default handler;

const isUrl = (text) => /^https?:\/\/.+\.(jpe?g|png|gif|mp4|webm|mkv|mov)$/i.test(text);
