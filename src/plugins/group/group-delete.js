/**
 * @file Delete message command handler
 * @module plugins/group/delete
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Deletes a message from a WhatsApp group
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to delete messages in a WhatsApp group. Can only delete messages sent by other users.
 * The bot must be an admin and have the necessary permissions to delete messages.
 *
 * @features
 * - Delete messages by replying to them
 * - Cannot delete bot's own messages
 * - Proper permission checking
 * - Error handling for failed deletions
 */

let handler = async (m, { sock }) => {
    if (!m.quoted) return m.reply("Reply message to delete");

    const { chat, id, participant, sender, fromMe } = m.quoted.vM;
    if (fromMe) return m.reply("Cannot delete bot msg");

    const qs = participant || sender;
    if (!qs) return m.reply("No sender found");

    try {
        await sock.sendMessage(chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id,
                participant: qs,
            },
        });
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
handler.help = ["delete"];
handler.tags = ["group"];
handler.command = /^(d|delete)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
