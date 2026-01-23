/**
 * @file Get file command handler
 * @module plugins/owner/getfile
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Retrieves and sends files from the bot's file system
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array} args - Command arguments (file path)
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to retrieve and send files from the bot's file system as documents.
 * Only accessible by bot owner for security reasons.
 *
 * @features
 * - Retrieves files from specified paths
 * - Automatically adds .js extension if not provided
 * - Sends files as documents with proper mimetype
 * - Shows filename in message
 * - Only accessible by bot owner
 */

import { join, extname } from "node:path";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    if (!args.length) {
        return m.reply(`Need file path\nEx: ${usedPrefix + command} plugins/owner/owner-sf`);
    }

    try {
        let t = join(...args);
        if (!extname(t)) t += ".js";
        const fp = join(process.cwd(), t);

        const buf = Buffer.from(await Bun.file(fp).arrayBuffer());
        const name = t.split("/").pop();

        await sock.sendMessage(
            m.chat,
            {
                document: buf,
                fileName: name,
                mimetype: "application/javascript",
            },
            { quoted: m }
        );
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["getfile"];
handler.tags = ["owner"];
handler.command = /^(getfile|gf)$/i;
handler.owner = true;

export default handler;
