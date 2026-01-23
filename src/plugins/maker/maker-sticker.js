/**
 * @file Sticker converter command handler
 * @module plugins/maker/sticker
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { sticker } from "#lib/sticker.js";

/**
 * Converts images, GIFs, and videos to stickers
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array<string>} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Converts various media types to stickers with automatic size optimization.
 * Supports local files, quoted messages, and direct URLs.
 *
 * @features
 * - Converts images, GIFs, and videos to stickers
 * - Supports local files and URLs
 * - Automatic quality optimization for file size
 * - Progressive compression if file too large
 * - Custom sticker pack metadata
 */

let handler = async (m, { sock, args, usedPrefix, command }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime && !args[0]) {
            return m.reply(`Send/Reply media or URL\nEx: ${usedPrefix + command}`);
        }

        await global.loading(m, sock);

        let buf;
        if (args[0] && isUrl(args[0])) {
            const res = await fetch(args[0]);
            if (!res.ok) throw new Error("Fetch failed");
            buf = Buffer.from(await res.arrayBuffer());
        } else {
            const media = await q.download?.();
            if (!media) return m.reply("Download failed");
            buf = Buffer.isBuffer(media) ? media : media.data ? Buffer.from(media.data) : null;
        }

        if (!buf) throw new Error("Empty buffer");

        const opt = {
            quality: 90,
            fps: 30,
            maxDuration: 10,
            packName: global.config.stickpack,
            authorName: global.config.stickauth,
            emojis: [],
        };

        let stc = await sticker(buf, opt);
        const max = 1024 * 1024;
        let step = 0;

        while (stc.length > max && step < 4) {
            step++;
            opt.quality -= 10;
            if (opt.quality < 50) opt.quality = 50;
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
 * URL validation helper
 * @param {string} txt - Text to check
 * @returns {boolean} True if valid media URL
 */
const isUrl = (txt) => /^https?:\/\/.+\.(jpe?g|png|gif|mp4|webm|mkv|mov)$/i.test(txt);

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["sticker"];
handler.tags = ["maker"];
handler.command = /^(s(tic?ker)?)$/i;

export default handler;
