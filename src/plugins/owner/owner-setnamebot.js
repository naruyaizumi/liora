/**
 * @file Set bot name command handler
 * @module plugins/owner/setname
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Sets the bot's WhatsApp display name
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - New display name
 * @param {string} command - Command name
 * @param {string} usedPrefix - Command prefix used
 * @returns {Promise<void>}
 *
 * @description
 * Command to set or update the bot's WhatsApp display name.
 * Changes the name that appears in contacts and chats.
 *
 * @features
 * - Sets bot's WhatsApp display name
 * - Requires text argument for new name
 * - Confirms update with new name
 * - Only accessible by bot owner
 */

let handler = async (m, { sock, text, command, usedPrefix }) => {
    if (!text) return m.reply(`Set bot name\nEx: ${usedPrefix + command} Liora`);

    await sock.updateProfileName(text);
    m.reply(`Name updated: ${text}`);
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["setnamebot"];
handler.tags = ["owner"];
handler.command = /^set(name(bot)?)$/i;
handler.owner = true;

export default handler;
