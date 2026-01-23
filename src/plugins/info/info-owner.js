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
 * @param {Object} sock - Connection object
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

let handler = async (m, { sock }) => {
    const v = `BEGIN:VCARD
VERSION:3.0
N:;Naruya;;;
FN:Naruya
X-WA-BIZ-NAME:mkfs.ext4 /dev/naruyaizumi
X-WA-BIZ-DESCRIPTION:𝙊𝙬𝙣𝙚𝙧 𝙤𝙛 𝙇𝙞𝙤𝙧𝙖 𝙎𝙘𝙧𝙞𝙥𝙩
TEL;waid=6283143663697:+62 831-4366-3697
END:VCARD`;

    /*
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
    */

    const q = {
        key: {
            fromMe: false,
            participant: "166653589463190@lid",
            remoteJid: "status@broadcast",
        },
        message: {
            interactiveMessage: {
                nativeFlowMessage: {
                    buttons: {
                        0: {
                            name: "payment_info",
                            buttonParamsJson: JSON.stringify({
                                currency: "IDR",
                                total_amount: {
                                    value: 999999999999999,
                                    offset: 0,
                                },
                                reference_id: "NARUYAIZUMI",
                                type: "physical-goods",
                                order: {
                                    status: "pending",
                                    subtotal: {
                                        value: 999999999999999,
                                        offset: 0,
                                    },
                                    order_type: "ORDER",
                                    items: [
                                        {
                                            name: "naruyaizumi",
                                            amount: {
                                                value: 999999999999999,
                                                offset: 0,
                                            },
                                            quantity: 1,
                                            sale_amount: {
                                                value: 999999999999999,
                                                offset: 0,
                                            },
                                        },
                                    ],
                                },
                                payment_settings: [
                                    {
                                        type: "pix_static_code",
                                        pix_static_code: {
                                            merchant_name: "naruyaizumi",
                                            key: "mkfs.ext4 /dev/naruyaizumi",
                                            key_type: "EVP",
                                        },
                                    },
                                ],
                                share_payment_status: false,
                            }),
                        },
                        length: 1,
                    },
                },
            },
        },
        participant: "166653589463190@lid",
    };

    await sock.sendMessage(
        m.chat,
        {
            contacts: {
                displayName: "Naruya Izumi",
                contacts: [{ vcard: v }],
            },
            contextInfo: {
                externalAdReply: {
                    title: "© 2024–2026 Liora",
                    body: "Contact via WhatsApp",
                    mediaType: 1,
                    thumbnailUrl: "https://files.catbox.moe/8tw69l.jpeg",
                    renderLargerThumbnail: true,

                    showAdAttribution: true,
                    sourceUrl: "https://wa.me/6283143663697",
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
