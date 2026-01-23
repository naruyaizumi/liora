/**
 * @file Pin message command handler
 * @module plugins/group/pin
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Pins a message in WhatsApp group for specified duration
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to pin messages in WhatsApp groups with customizable durations.
 * Supports three pin durations: 1 day, 7 days, and 30 days.
 *
 * @features
 * - Pin messages by replying to them
 * - Three duration options (1, 7, 30 days)
 * - Clear duration explanation
 * - Proper error handling for invalid messages
 * - Requires admin and bot admin privileges
 */

let handler = async (m, { sock, args, usedPrefix, command }) => {
    if (!m.quoted) return m.reply("Reply message to pin");

    if (!args[0]) {
        return m.reply(
            `Pin duration\nEx:\n${usedPrefix + command} 1 = 1 day\n${usedPrefix + command} 2 = 7 days\n${usedPrefix + command} 3 = 30 days`
        );
    }

    const dur = {
        1: { sec: 86400, label: "1 day" },
        2: { sec: 604800, label: "7 days" },
        3: { sec: 2592000, label: "30 days" },
    };

    const opt = dur[args[0]];
    if (!opt) return m.reply("Invalid. Use 1, 2, or 3");

    const key = m.quoted?.vM?.key;
    if (!key) return m.reply("Cannot pin: no key");

    try {
        await sock.sendMessage(m.chat, {
            pin: key,
            type: 1,
            time: opt.sec,
        });
        m.reply(`Pinned for ${opt.label}`);
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} group - Whether command works only in groups
 * @property {boolean} botAdmin - Whether bot needs admin privileges
 * @property {boolean} admin - Whether user needs admin privileges
 */
handler.help = ["pin"];
handler.tags = ["group"];
handler.command = /^(pin)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
