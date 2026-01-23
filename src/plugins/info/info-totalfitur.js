/**
 * @file Total features statistics command handler
 * @module plugins/info/totalfitur
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Displays bot plugin statistics including total features, categories, and plugins
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to display statistical information about the bot's plugins and features.
 * Shows counts of total features, categories, and plugins loaded in the system.
 *
 * @features
 * - Shows total number of features/commands
 * - Displays total number of categories/tags
 * - Shows total number of plugins loaded
 * - Simple and informative statistics display
 */

let handler = async (m, { sock }) => {
    const p = Object.values(global.plugins);
    const tc = p.reduce((s, v) => s + (v.help ? v.help.length : 0), 0);
    const tt = [...new Set(p.flatMap((v) => v.tags || []))].length;
    const tp = p.length;

    const t = `
Liora Plugin Statistics

Total Features: ${tc}
Total Categories: ${tt}
Total Plugins: ${tp}
`.trim();

    await sock.sendMessage(m.chat, { text: t }, { quoted: m });
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["totalfitur"];
handler.tags = ["info"];
handler.command = /^(totalfitur)$/i;

export default handler;
