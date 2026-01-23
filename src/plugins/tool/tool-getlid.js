/**
 * @file Get LID (Local ID) command handler
 * @module plugins/tools/getlid
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Retrieves WhatsApp LID (Local ID) from phone number or mention
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - Phone number or user identifier
 * @returns {Promise<void>}
 *
 * @description
 * Command to retrieve WhatsApp LID (Local ID) from phone numbers, mentions, or replies.
 * LID is WhatsApp's internal user identifier used in the Signal protocol.
 *
 * @features
 * - Resolves LID from phone numbers
 * - Works with mentioned users
 * - Works with replied messages
 * - Handles both regular JIDs and LIDs
 * - Interactive copy button for easy sharing
 */

let handler = async (m, { sock, text }) => {
    try {
        await global.loading(m, sock);

        const inp =
            m.mentionedJid?.[0] ||
            m.quoted?.sender ||
            (text && /^\d+$/.test(text) ? text + "@s.whatsapp.net" : null);

        if (!inp) throw new Error("Enter number, mention, or reply");

        let lid;

        if (/@lid$/.test(inp)) {
            lid = inp.replace(/@lid$/, "");
        } else {
            const r = await sock.signalRepository.lidMapping.getLIDForPN(inp);
            if (!r) throw new Error("Cannot resolve LID");
            lid = r.replace(/@lid$/, "");
        }

        await sock.client(m.chat, {
            text: `Target LID: ${lid}`,
            title: "Result",
            footer: "Use button below to copy",
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Copy LID",
                        copy_code: lid,
                    }),
                },
            ],
            hasMediaAttachment: false,
        });
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["getlid"];
handler.tags = ["tools"];
handler.command = /^(getlid)$/i;

export default handler;
