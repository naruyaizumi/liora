/**
 * @file Add member to group command handler
 * @module plugins/group/add
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Adds a member to a WhatsApp group
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
 * Command to add members to a WhatsApp group. Can add members by replying to their message
 * or by providing their phone number as an argument.
 *
 * @features
 * - Add members by replying to their message
 * - Add members by providing phone number
 * - Mention the added user in confirmation message
 * - Proper error handling and status reporting
 */

let handler = async (m, { sock, args, usedPrefix, command }) => {
    let target = m.quoted?.sender || null;

    if (!target && args[0]) {
        const num = args[0].replace(/[^0-9]/g, "");
        if (num.length >= 5) target = num + "@s.whatsapp.net";
    }

    if (!target?.endsWith("@s.whatsapp.net")) {
        return m.reply(`Add member\nEx: ${usedPrefix + command} 6281234567890`);
    }

    try {
        const res = await sock.groupParticipantsUpdate(m.chat, [target], "add");
        const user = res?.[0];

        if (user?.status === "200") {
            return sock.sendMessage(
                m.chat,
                {
                    text: `Added @${target.split("@")[0]}`,
                    mentions: [target],
                },
                { quoted: m }
            );
        }

        return m.reply(`Failed to add. Status: ${user?.status || "unknown"}`);
    } catch (e) {
        return m.reply(`Error: ${e.message}`);
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
handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
