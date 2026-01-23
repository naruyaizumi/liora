/**
 * @file Self mode command handler
 * @module plugins/owner/self
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Controls self mode for the bot (responds only to owner)
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 * @param {string} param1.text - Command argument (on/off)
 * @param {string} param1.usedPrefix - Command prefix used
 * @param {string} param1.command - Command name
 * @param {Object} param1.sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to toggle self mode for the bot.
 * When enabled, bot only responds to commands from the owner.
 * When disabled, bot responds to commands from all users.
 *
 * @features
 * - Toggle self mode on/off
 * - Show current mode status
 * - Support for 'on/off' and 'enable/disable' aliases
 * - Only accessible by bot owner
 * - Prevents redundant state changes
 */

let handler = async (m, { text, usedPrefix, command, sock }) => {
    try {
        const s = global.db.data.settings[sock.user.lid] || {};

        if (!text) {
            const st = s.self ? "ON" : "OFF";
            return m.reply(
                `Self mode: ${st}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off'`
            );
        }

        switch (text.toLowerCase()) {
            case "off":
            case "disable":
                if (!s.self) return m.reply("Already off");
                s.self = false;
                return m.reply("Self mode off");

            case "on":
            case "enable":
                if (s.self) return m.reply("Already on");
                s.self = true;
                return m.reply("Self mode on");

            default:
                return m.reply(`Invalid\nUse: ${usedPrefix + command} on | off`);
        }
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
handler.help = ["self"];
handler.tags = ["owner"];
handler.command = /^(self(mode)?)$/i;
handler.owner = true;

export default handler;
