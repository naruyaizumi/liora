/**
 * @file WhatsApp ID extractor command handler
 * @module plugins/tools/cekid
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Extracts WhatsApp group or channel ID from invite links
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @returns {Promise<void>}
 *
 * @description
 * Extracts the internal WhatsApp ID from group or channel invite links.
 * Returns the ID with a copy button for convenience.
 *
 * @supportedLinks
 * - WhatsApp group invites: https://chat.whatsapp.com/INVITE_CODE
 * - WhatsApp channels: https://whatsapp.com/channel/CHANNEL_ID
 */

let handler = async (m, { sock, args, usedPrefix }) => {
    try {
        const text = args[0];
        if (!text) return m.reply(`Usage: ${usedPrefix}cekid <WhatsApp group or channel link>`);

        let url;
        try {
            url = new URL(text);
        } catch {
            return m.reply("Invalid link format.");
        }

        let isGroup =
            url.hostname === "chat.whatsapp.com" && /^\/[A-Za-z0-9]{20,}$/.test(url.pathname);
        let isChannel = url.hostname === "whatsapp.com" && url.pathname.startsWith("/channel/");
        let id;

        if (isGroup) {
            const code = url.pathname.replace(/^\/+/, "");
            const res = await sock.groupGetInviteInfo(code);
            id = res.id;
        } else if (isChannel) {
            const code = url.pathname.split("/channel/")[1]?.split("/")[0];
            const res = await sock.newsletterMetadata("invite", code, "GUEST");
            id = res.id;
        } else {
            return m.reply("Unsupported link. Provide a valid group or channel link.");
        }

        await sock.client(m.chat, {
            text: `Target ID: ${id}`,
            title: "Result",
            footer: "Use the button below to copy the ID",
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Copy ID",
                        copy_code: id,
                    }),
                },
            ],
            hasMediaAttachment: false,
        });
    } catch (e) {
        global.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["cekid <link>"];
handler.tags = ["tools"];
handler.command = /^(cekid|id)$/i;

export default handler;
