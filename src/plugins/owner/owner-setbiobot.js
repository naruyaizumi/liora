/**
 * @file Set bot bio command handler
 * @module plugins/owner/setbio
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Sets the bot's WhatsApp status/bio
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - New bio text
 * @param {string} command - Command name
 * @param {string} usedPrefix - Command prefix used
 * @returns {Promise<void>}
 *
 * @description
 * Command to set or update the bot's WhatsApp status/bio.
 * Changes the text that appears in the bot's profile status.
 *
 * @features
 * - Sets bot's WhatsApp status/bio
 * - Requires text argument for new bio
 * - Confirms update with new bio text
 * - Only accessible by bot owner
 */

let handler = async (m, { sock, text, command, usedPrefix }) => {
    if (!text) return m.reply(`Set bot bio\nEx: ${usedPrefix + command} I am a bot`);

    await sock.setStatus(text);
    m.reply(`Bio updated: ${text}`);
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["setbiobot"];
handler.tags = ["owner"];
handler.command = /^set(bio(bot)?)$/i;
handler.owner = true;

export default handler;
