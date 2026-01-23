/**
 * @file Group-only mode command handler
 * @module plugins/owner/gconly
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Controls whether bot only responds in groups
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
 * Command to toggle group-only mode for the bot.
 * When enabled, bot only responds to commands in group chats.
 * When disabled, bot responds in both private and group chats.
 *
 * @features
 * - Toggle group-only mode on/off
 * - Show current mode status
 * - Support for 'on/off' and 'enable/disable' aliases
 * - Only accessible by bot owner
 * - Prevents redundant state changes
 */

let handler = async (m, { text, usedPrefix, command, sock }) => {
    try {
        const s = global.db.data.settings[sock.user.lid] || {};

        if (!text) {
            const st = s.gconly ? "ON" : "OFF";
            return m.reply(
                `GC Only: ${st}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off'`
            );
        }

        switch (text.toLowerCase()) {
            case "off":
            case "disable":
                if (!s.gconly) return m.reply("Already off");
                s.gconly = false;
                return m.reply("GC Only off");

            case "on":
            case "enable":
                if (s.gconly) return m.reply("Already on");
                s.gconly = true;
                return m.reply("GC Only on");

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
handler.help = ["gconly"];
handler.tags = ["owner"];
handler.command = /^(gconly|grouponly)$/i;
handler.owner = true;

export default handler;
