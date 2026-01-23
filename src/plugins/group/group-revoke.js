/**
 * @file Revoke group invitation link command handler
 * @module plugins/group/revoke
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Revokes and resets the WhatsApp group invitation link
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to revoke the current group invitation link and generate a new one.
 * This invalidates all previously shared links and creates a fresh invitation link.
 *
 * @features
 * - Revokes current group invitation link
 * - Generates new invitation link automatically
 * - Simple one-command operation
 * - Requires bot and user admin privileges
 */

let handler = async (m, { sock }) => {
    await sock.groupRevokeInvite(m.chat);
    m.reply("Link reset");
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
handler.help = ["revoke"];
handler.tags = ["group"];
handler.command = /^(revoke)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
