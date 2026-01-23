/**
 * @file Promote member to admin command handler
 * @module plugins/group/promote
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Promotes a group member to administrator
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array} args - Command arguments
 * @param {Array} participants - Group participants list
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to promote regular group members to administrators.
 * Supports promoting by mention, reply, phone number, or LID.
 *
 * @features
 * - Promote by mentioning user
 * - Promote by replying to user's message
 * - Promote by phone number (converts to LID if needed)
 * - Promote by LID directly
 * - Mentions promoted user in confirmation message
 * - Requires bot and user admin privileges
 */

let handler = async (m, { sock, args, participants, usedPrefix, command }) => {
    let t = m.mentionedJid?.[0] || m.quoted?.sender || null;

    if (!t && args[0] && /^\d{5,}$/.test(args[0])) {
        const num = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        const lid = await sock.signalRepository.lidMapping.getLIDForPN(num);
        if (lid) t = lid;
    }

    if (!t && args[0]) {
        const raw = args[0].replace(/[^0-9]/g, "") + "@lid";
        if (participants.some((p) => p.id === raw)) t = raw;
    }

    if (!t || !participants.some((p) => p.id === t))
        return m.reply(`Promote member\nEx: ${usedPrefix + command} @628xxx`);

    await sock.groupParticipantsUpdate(m.chat, [t], "promote");

    await sock.sendMessage(
        m.chat,
        {
            text: `Promoted @${t.split("@")[0]}`,
            mentions: [t],
        },
        { quoted: m }
    );
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
handler.help = ["promote"];
handler.tags = ["group"];
handler.command = /^(promote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
