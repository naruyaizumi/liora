/**
 * @file Sticker command handler
 * @module plugins/maker/sticker
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { sticker } from "#lib/sticker.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime && !args[0]) {
            return m.reply(`*Sticker Maker*

*Usage:*
• ${usedPrefix + command}
• ${usedPrefix + command} pack|author
• ${usedPrefix + command} <url>

*Note:* Reply media or provide URL`);
        }

        await global.loading(m, sock);

        let packName = global.config.stickpack;
        let authorName = global.config.stickauth;

        const allArgs = args.join(" ");

        if (allArgs.includes("|")) {
            const i = allArgs.indexOf("|");
            packName = allArgs.slice(0, i).trim();
            authorName = allArgs.slice(i + 1).trim();
        }

        let buf;
        if (allArgs && !allArgs.includes("|") && isUrl(allArgs)) {
            const res = await fetch(allArgs);
            if (!res.ok) throw new Error("Fetch failed");
            buf = Buffer.from(await res.arrayBuffer());
        } else {
            const media = await q.download?.();
            if (!media) return m.reply("Download failed");
            buf = Buffer.isBuffer(media)
                ? media
                : media.data
                ? Buffer.from(media.data)
                : null;
        }

        if (!buf) throw new Error("Empty buffer");

        const opt = {
            quality: 90,
            fps: 30,
            maxDuration: 10,
            packName,
            authorName,
            emojis: [],
        };

        let stc = await sticker(buf, opt);
        let step = 0;

        while (stc.length > 1024 * 1024 && step < 4) {
            step++;
            opt.quality = Math.max(50, opt.quality - 10);
            if (step >= 2) opt.fps = Math.max(8, opt.fps - 2);
            stc = await sticker(buf, opt);
        }

        await sock.sendMessage(m.chat, { sticker: stc }, { quoted: m });
    } catch (e) {
        sock.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

/**
 * URL checker
 */
const isUrl = (txt) =>
    /^https?:\/\/.+\.(jpe?g|png|gif|mp4|webm|mkv|mov)$/i.test(txt);

handler.help = ["sticker"];
handler.tags = ["maker"];
handler.command = /^(s(tic?ker)?)$/i;

export default handler;