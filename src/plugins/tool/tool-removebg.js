/**
 * @file Remove background from image command handler
 * @module plugins/tools/removebg
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { removebg } from "#api/removebg.js";

/**
 * Removes background from images using AI-powered background removal
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} command - Command name
 * @param {string} usedPrefix - Command prefix used
 * @returns {Promise<void>}
 *
 * @description
 * Command to remove background from images using AI-powered background removal service.
 * Supports JPEG, PNG, and WebP image formats.
 *
 * @features
 * - Removes image backgrounds using external API
 * - Supports JPEG, PNG, and WebP formats
 * - Works with sent or replied images
 * - Returns transparent background image
 */

let handler = async (m, { sock, command, usedPrefix }) => {
    const q = m.quoted?.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
        return m.reply(`Send/reply image\nEx: ${usedPrefix + command}`);
    }

    try {
        await global.loading(m, sock);

        const img = await q.download();
        if (!img) return m.reply("Invalid image");

        const { success, resultUrl, resultBuffer, error } = await removebg(img);
        if (!success) throw new Error(error || "Failed");

        await sock.sendMessage(
            m.chat,
            {
                image: resultBuffer ? resultBuffer : { url: resultUrl },
                caption: "BG removed",
            },
            { quoted: m }
        );
    } catch (e) {
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
handler.help = ["removebg"];
handler.tags = ["tools"];
handler.command = /^(removebg)$/i;

export default handler;
