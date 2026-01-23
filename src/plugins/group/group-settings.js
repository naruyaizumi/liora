/**
 * @file Group setting control command handler
 * @module plugins/group/setting
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Controls group announcement settings (open/close group)
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
 * Command to toggle group announcement settings between open and closed modes.
 * Open mode allows all members to send messages, closed mode restricts to admins only.
 *
 * @features
 * - Toggle group between open and closed modes
 * - Simple one-word commands (open/close)
 * - Clear confirmation messages
 * - Requires bot and user admin privileges
 */

let handler = async (m, { sock, args, usedPrefix, command }) => {
    const arg = (args[0] || "").toLowerCase();
    const mode = { open: "not_announcement", close: "announcement" }[arg];

    if (!mode) return m.reply(`Use: ${usedPrefix + command} open/close`);

    await sock.groupSettingUpdate(m.chat, mode);
    return m.reply(`Group ${arg === "open" ? "opened" : "closed"}`);
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
handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
