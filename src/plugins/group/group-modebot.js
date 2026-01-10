/**
 * @file Control bot response mode in chat
 * @module plugins/group/botmode
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Controls bot response mode in a chat (mute/unmute)
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 * @param {string} param1.text - Text argument
 * @param {string} param1.usedPrefix - Command prefix used
 * @param {string} param1.command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to toggle the bot's response mode in a chat.
 * When muted, the bot will not respond to commands except for specific ones.
 *
 * @features
 * - Toggle bot responses ON/OFF
 * - Show current bot status
 * - Support for 'on/off' and 'unmute/mute' aliases
 * - Only accessible by bot owner
 * - Prevents redundant state changes
 */

let handler = async (m, { text, usedPrefix, command }) => {
    const chat = global.db.data.chats[m.chat];

    if (!text) {
        const status = chat.mute ? "OFF" : "ON";
        return m.reply(`Bot: ${status}\nUse: ${usedPrefix + command} on/off`);
    }

    switch (text.toLowerCase()) {
        case "off":
        case "mute":
            if (chat.mute) return m.reply("Already OFF");
            chat.mute = true;
            return m.reply("Bot OFF");

        case "on":
        case "unmute":
            if (!chat.mute) return m.reply("Already ON");
            chat.mute = false;
            return m.reply("Bot ON");

        default:
            return m.reply(`Invalid\nUse: ${usedPrefix + command} on/off`);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["botmode"];
handler.tags = ["group"];
handler.command = /^(bot(mode)?)$/i;
handler.owner = true;

export default handler;
