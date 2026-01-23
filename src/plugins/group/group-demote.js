/**
 * @file Demote member command handler
 * @module plugins/group/demote
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Demotes a group admin to regular member
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
 * Command to demote group administrators back to regular members.
 * Supports demoting by mention, reply, phone number, or LID.
 *
 * @features
 * - Demote by mentioning user
 * - Demote by replying to user's message
 * - Demote by phone number (converts to LID if needed)
 * - Demote by LID directly
 * - Mentions demoted user in confirmation message
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
        return m.reply(`Demote member\nEx: ${usedPrefix + command} @628xxx`);

    await sock.groupParticipantsUpdate(m.chat, [t], "demote");

    await sock.sendMessage(
        m.chat,
        {
            text: `Demoted @${t.split("@")[0]}`,
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
handler.help = ["demote"];
handler.tags = ["group"];
handler.command = /^(demote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
