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
 * @param {Object} conn - Connection object
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

let handler = async (m, { conn, text }) => {
    const q = m.quoted ?? m;

    if (!q || !/sticker|image|video/.test(q.mtype)) {
        return m.reply("Reply sticker/image/video");
    }

    let [pack, author] = (text || "").split("|");
    pack = (pack || global.config.stickpack || "").trim();
    author = (author || global.config.stickauth || "").trim();

    await global.loading(m, conn);

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

        let stc;
        const isWebp =
            buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP";

        if (isWebp) {
            stc = await addExif(buf, { packName: pack, authorName: author, emojis: [] });
        } else {
            const tmp = await sticker(buf, { packName: pack, authorName: author });
            stc = await addExif(tmp, { packName: pack, authorName: author, emojis: [] });
        }

        await conn.sendMessage(m.chat, { sticker: stc }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
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
