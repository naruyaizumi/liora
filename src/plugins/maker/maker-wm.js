/**
 * @file Sticker watermark editor command handler
 * @module plugins/maker/watermark
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { addExif, sticker } from "#lib/sticker.js";

/**
 * Edits sticker metadata (pack name and author)
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - Watermark text (pack|author)
 * @returns {Promise<void>}
 *
 * @description
 * Modifies sticker metadata including pack name and author.
 * Works with existing stickers, images, and videos.
 *
 * @features
 * - Edits sticker pack metadata
 * - Works with stickers, images, and videos
 * - Accepts pack|author format
 * - Falls back to global config if no text provided
 * - Converts media to stickers if needed
 */

let handler = async (m, { sock, text }) => {
    const q = m.quoted ?? m;

    if (!q || !/sticker|image|video/.test(q.mtype)) {
        return m.reply("Reply to sticker/image/video");
    }

    let [pack, author] = (text || "").split("|");
    pack = pack?.trim() || global.config.stickpack || "";
    author = author?.trim() || global.config.stickauth || "";

    await global.loading(m, sock);

    try {
        const media = await q.download?.();
        if (!media) throw new Error("Download failed");

        let buf;
        if (typeof media === "string" && /^https?:\/\//.test(media)) {
            const res = await fetch(media);
            if (!res.ok) throw new Error("Fetch failed");
            buf = Buffer.from(await res.arrayBuffer());
        } else if (Buffer.isBuffer(media)) {
            buf = media;
        } else if (media?.data) {
            buf = Buffer.from(media.data);
        }

        if (!buf) throw new Error("Empty buffer");

        // Check if already a WebP sticker
        const isWebp =
            buf[0] === 0x52 &&
            buf[1] === 0x49 &&
            buf[2] === 0x46 &&
            buf[3] === 0x46 &&
            buf[8] === 0x57 &&
            buf[9] === 0x45 &&
            buf[10] === 0x42 &&
            buf[11] === 0x50;

        let stc;
        if (isWebp) {
            // Just add EXIF to existing WebP
            stc = await addExif(buf, {
                packName: pack,
                packPublish: author,
                emojis: [],
            });
        } else {
            // Convert to sticker first, then add EXIF
            stc = await sticker(buf, {
                packName: pack,
                authorName: author,
                emojis: [],
            });
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
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["watermark"];
handler.tags = ["maker"];
handler.command = /^(wm|watermark)$/i;

export default handler;
