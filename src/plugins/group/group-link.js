/**
 * @file Group link command handler
 * @module plugins/group/link
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Retrieves and displays the WhatsApp group invitation link
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Object} groupMetadata - Group metadata object
 * @returns {Promise<void>}
 *
 * @description
 * Command to get the invitation link for the current WhatsApp group.
 * Displays the link in an interactive button format that allows copying.
 *
 * @features
 * - Retrieves current group invitation link
 * - Displays group name and ID
 * - Interactive copy button for easy sharing
 * - Simple and user-friendly interface
 * - Requires bot admin privileges to access link
 */

let handler = async (m, { sock, groupMetadata }) => {
    const invite = await sock.groupInviteCode(m.chat);
    const link = `https://chat.whatsapp.com/${invite}`;
    const txt = `Group: ${groupMetadata.subject}\nID: ${m.chat}`;

    await sock.client(m.chat, {
        text: txt,
        title: "Group Link",
        footer: "Click button to copy",
        interactiveButtons: [
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: "Copy",
                    copy_code: link,
                }),
            },
        ],
        hasMediaAttachment: false,
    });
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} group - Whether command works only in groups
 * @property {boolean} botAdmin - Whether bot needs admin privileges
 */
handler.help = ["grouplink"];
handler.tags = ["group"];
handler.command = /^(grouplink|link)$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;
