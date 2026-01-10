/**
 * @file Delete file command handler
 * @module plugins/owner/deletefile
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Deletes files from the bot's file system
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 * @param {Array} param1.args - Command arguments (file path)
 * @param {string} param1.usedPrefix - Command prefix used
 * @param {string} param1.command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to delete files from the bot's file system.
 * Only accessible by bot owner for security reasons.
 *
 * @features
 * - Deletes files from specified paths
 * - Automatically adds .js extension if not provided
 * - Validates file existence before deletion
 * - Uses Bun.file for file operations
 * - Only accessible by bot owner
 */

import path from "node:path";

let handler = async (m, { args, usedPrefix, command }) => {
    if (!args.length) {
        return m.reply(`Need file path\nEx: ${usedPrefix + command} plugins/owner/owner-sf`);
    }

    let t = path.join(...args);
    if (!path.extname(t)) t += ".js";
    const fp = path.resolve(process.cwd(), t);

    try {
        const f = Bun.file(fp);
        const ex = await f.exists();
        if (!ex) throw new Error(`File not found: ${fp}`);

        await f.delete();
        m.reply("File deleted");
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
handler.help = ["deletefile"];
handler.tags = ["owner"];
handler.command = /^(df|deletefile)$/i;
handler.owner = true;

export default handler;
