/**
 * @file Image enhancement (HD/Remini) command handler
 * @module plugins/tools/remini
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Enhances image quality using Remini-like AI enhancement
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
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
 * - Handles both buffer and URL responses
 */

import { remini } from "#api/remini.js";

let handler = async (m, { conn, command, usedPrefix }) => {
    const q = m.quoted?.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
        return m.reply(`Send/reply image.\nEx: ${usedPrefix + command}`);
    }

    try {
        await global.loading(m, conn);
        const img = await q.download();
        if (!img) return m.reply("Invalid image");

        const { success, resultUrl, resultBuffer, error } = await remini(img);
        if (!success) throw new Error(error || "Failed");

        if (resultBuffer) {
            const buffer = Buffer.from(
                resultBuffer.buffer,
                resultBuffer.byteOffset,
                resultBuffer.byteLength
            );
            await conn.sendMessage(
                m.chat,
                {
                    image: buffer,
                    caption: "Image enhanced",
                },
                { quoted: m }
            );
        } else {
            await conn.sendMessage(
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
        await global.loading(m, conn, true);
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