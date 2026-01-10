/**
 * @file Reload plugins command handler
 * @module plugins/owner/reload
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Reloads all plugins and handlers
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @returns {Promise<void>}
 *
 * @description
 * Command to reload all bot plugins and handlers without restarting.
 * Useful for applying changes to plugins during development.
 *
 * @features
 * - Reloads all plugin modules
 * - Reloads command handlers
 * - Applies changes without restart
 * - Only accessible by bot owner
 * - Simple confirmation message
 */

let handler = async (m) => {
    await global.reloadAllPlugins();
    await global.reloadHandler();
    m.reply("Reloaded");
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["reload"];
handler.tags = ["owner"];
handler.command = /^(reload|rl)$/i;
handler.owner = true;

export default handler;
