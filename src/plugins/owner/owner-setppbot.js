/**
 * @file Set bot profile picture command handler
 * @module plugins/owner/setpp
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Sets the bot's WhatsApp profile picture
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to set or update the bot's WhatsApp profile picture.
 * Requires sending or replying to an image message.
 *
 * @features
 * - Sets bot's WhatsApp profile picture
 * - Requires image attachment or reply
 * - Validates image mimetype
 * - Downloads and updates profile picture
 * - Only accessible by bot owner
 */

let handler = async (m, { sock, usedPrefix, command }) => {
    const bot = sock.decodeJid(sock.user.id);
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";

    if (!/image/.test(mime)) return m.reply(`Send/reply image\nEx: ${usedPrefix + command}`);

    const img = await q.download();
    if (!img) return m.reply("Failed");

    await sock.updateProfilePicture(bot, img);
    m.reply("PP updated");
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["setppbot"];
handler.tags = ["owner"];
handler.command = /^setpp(bot)?$/i;
handler.owner = true;

export default handler;
