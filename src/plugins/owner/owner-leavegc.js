/**
 * @file Leave group command handler
 * @module plugins/owner/leavegc
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Makes the bot leave a WhatsApp group
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - Group chat ID (optional)
 * @returns {Promise<void>}
 *
 * @description
 * Command to make the bot leave a WhatsApp group.
 * Can leave the current group or a specified group by chat ID.
 *
 * @features
 * - Leaves current group or specified group
 * - Sends farewell message before leaving
 * - Only accessible by bot owner
 * - Simple and straightforward operation
 */

let handler = async (m, { sock, text }) => {
    const gc = text || m.chat;

    await sock.sendMessage(gc, { text: "Leaving group" });
    await sock.groupLeave(gc);
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["leavegc"];
handler.tags = ["owner"];
handler.command = /^(out|leavegc)$/i;
handler.owner = true;

export default handler;
