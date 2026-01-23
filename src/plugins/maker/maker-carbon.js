/**
 * @file Carbon code image generator command handler
 * @module plugins/maker/carbon
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Generates stylish carbon code images from text
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
 * Creates beautiful carbon-style code snippet images.
 * Uses NekoLabs Canvas API for image generation.
 *
 * @features
 * - Generates carbon-style code images
 * - Preserves code formatting and syntax
 * - Returns as image message
 * - Simple one-line usage
 */

let handler = async (m, { sock, args, usedPrefix, command }) => {
    try {
        const code = args.join(" ");

        if (!code) {
            return m.reply(`Need code\nEx: ${usedPrefix + command} console.log("Hello")`);
        }

        await global.loading(m, sock);

        const url = `https://api.nekolabs.web.id/canvas/carbonify?code=${encodeURIComponent(code)}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("API request failed");

        const buf = Buffer.from(await res.arrayBuffer());

        await sock.sendMessage(
            m.chat,
            { image: buf, caption: "Carbon code snippet" },
            { quoted: m }
        );
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
handler.help = ["carbon"];
handler.tags = ["maker"];
handler.command = /^(carbon)$/i;

export default handler;
