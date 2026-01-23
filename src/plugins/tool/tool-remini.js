/**
 * @file Image enhancement (HD/Remini) command handler
 * @module plugins/tools/remini
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { remini } from "#api/remini.js";

/**
 * Enhances image quality using Remini-like AI enhancement
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} command - Command name
 * @param {string} usedPrefix - Command prefix used
 * @returns {Promise<void>}
 *
 * @description
 * Command to enhance image quality using AI-powered enhancement similar to Remini.
 * Supports JPEG, PNG, and WebP image formats for enhancement.
 *
 * @features
 * - Enhances image quality using external API
 * - Supports JPEG, PNG, and WebP formats
 * - Works with sent or replied images
 * - Returns enhanced image with caption
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

        const { success, resultUrl, resultBuffer, error } = await remini(img);
        if (!success) throw new Error(error || "Failed");

        if (resultBuffer) {
            await sock.sendMessage(
                m.chat,
                {
                    image: resultBuffer,
                    caption: "Image enhanced",
                },
                { quoted: m }
            );
        } else {
            await sock.sendMessage(
                m.chat,
                {
                    image: { url: resultUrl },
                    caption: "Image enhanced",
                },
                { quoted: m }
            );
        }
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
handler.help = ["hd"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;
