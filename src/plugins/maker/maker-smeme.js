/**
 * @file Sticker meme generator command handler
 * @module plugins/maker/smeme
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { sticker } from "#lib/sticker.js";
import { uploader } from "#lib/uploader.js";

/**
 * Generates meme stickers from images with top and bottom text
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
 * Creates meme stickers by adding text overlays to images.
 * Supports JPEG, PNG, and WEBP formats with top|bottom text format.
 *
 * @features
 * - Generates meme stickers from images
 * - Supports JPEG, PNG, and WEBP formats
 * - Adds top and bottom text overlays
 * - Uses NekoLabs Canvas API
 * - Uploads images to external storage
 */

let handler = async (m, { sock, args, usedPrefix, command }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.msg || q).mimetype || "";

        if (!mime || !/image\/(jpeg|png|webp)/.test(mime)) {
            return m.reply("Need JPEG/PNG/WEBP");
        }

        const [top = "", bottom = ""] = args.join(" ").split("|");

        if (!top && !bottom) {
            return m.reply(`Need text\nEx: ${usedPrefix + command} top|bottom`);
        }

        await global.loading(m, sock);

        const img = await q.download();
        const up = await uploader(img);

        if (!up) throw new Error("Upload failed");

        const url = `https://api.nekolabs.web.id/canvas/meme?imageUrl=${encodeURIComponent(up)}&textT=${encodeURIComponent(top)}&textB=${encodeURIComponent(bottom)}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("API request failed");

        const buf = Buffer.from(await res.arrayBuffer());
        const stc = await sticker(buf, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

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
handler.help = ["smeme"];
handler.tags = ["maker"];
handler.command = /^(smeme)$/i;

export default handler;
