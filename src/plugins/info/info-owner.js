/**
 * @file Owner/creator information command handler
 * @module plugins/info/owner
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Displays owner/creator contact information as a vCard
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to display the bot owner's contact information in vCard format.
 * Includes personal details, contact information, and social media links.
 *
 * @features
 * - Displays owner contact information as vCard
 * - Includes WhatsApp business profile details
 * - Shows social media links (Instagram)
 * - Contact address and business hours
 * - External advertisement integration
 * - Quoted message with forwarding context
 */

let handler = async (m, { conn }) => {
    const v = `BEGIN:VCARD
VERSION:3.0
FN:Naruya Izumi
ORG:Naruya Izumi
TITLE:Epictetus, Enchiridion — Chapter 1 (verse 1)
EMAIL;type=INTERNET:sexystyle088@gmail.com
TEL;type=CELL;waid=6283143663697:+6283143663697
ADR;type=WORK:;;2-chōme-7-5 Fuchūchō;Izumi;Osaka;594-0071;Japan
URL;type=WORK:https://www.instagram.com/naruyaizumi
X-WA-BIZ-NAME:Naruya Izumi
X-WA-BIZ-DESCRIPTION:𝙊𝙬𝙣𝙚𝙧 𝙤𝙛 𝙇𝙞𝙤𝙧𝙖 𝙎𝙘𝙧𝙞𝙥𝙩
X-WA-BIZ-HOURS:Mo-Su 00:00-23:59
END:VCARD`;

    const q = {
        key: {
            fromMe: false,
            participant: "12066409886@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            contactMessage: {
                displayName: "Naruya Izumi",
                vcard: v,
            },
        },
    };

    await conn.sendMessage(
        m.chat,
        {
            contacts: {
                displayName: "Naruya Izumi",
                contacts: [{ vcard: v }],
            },
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: "© 2024–2026 Liora",
                    body: "Contact via WhatsApp",
                    thumbnailUrl: "https://files.catbox.moe/8tw69l.jpeg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: q }
    );
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["owner"];
handler.tags = ["info"];
handler.command = /^(owner|creator)$/i;

export default handler;
