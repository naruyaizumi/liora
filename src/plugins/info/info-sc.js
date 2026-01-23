/**
 * @file Script information command handler
 * @module plugins/info/script
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Displays bot script information and repository details
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to display information about the bot's source code repository,
 * including GitHub links, issue reporting, and pull request information.
 *
 * @features
 * - Shows GitHub repository link
 * - Provides issue and pull request links
 * - Displays copyright information
 * - Interactive product display with image
 * - Request payment message simulation
 * - Newsletter forwarding context
 */

let handler = async (m, { sock }) => {
    const txt = `
Liora Repository

Project Script Izumi
Repository: https://github.com/naruyaizumi/liora
Report Bug: https://github.com/naruyaizumi/liora/issues
Pull Req: https://github.com/naruyaizumi/liora/pulls

© 2024 – 2025 Naruya Izumi • All Rights Reserved
    `.trim();

    const q = {
        key: {
            fromMe: false,
            participant: m.sender,
            remoteJid: m.chat,
        },
        message: {
            requestPaymentMessage: {
                amount: {
                    currencyCode: "USD",
                    offset: 0,
                    value: 99999999999,
                },
                expiryTimestamp: Date.now() + 24 * 60 * 60 * 1000,
                amount1000: 99999999999 * 1000,
                currencyCodeIso4217: "USD",
                requestFrom: m.sender,
                noteMessage: {
                    extendedTextMessage: {
                        text: "𝗟 𝗜 𝗢 𝗥 𝗔",
                    },
                },
                background: {
                    placeholderArgb: 4278190080,
                    textArgb: 4294967295,
                    subtextArgb: 4294967295,
                    type: 1,
                },
            },
        },
    };

    await sock.sendMessage(
        m.chat,
        {
            product: {
                productImage: {
                    url: "https://files.catbox.moe/wwboj3.jpg",
                },
                productId: "32409523241994909",
                title: "mkfs.ext4 /dev/naruyaizumi",
                description: "",
                currencyCode: "IDR",
                priceAmount1000: String(23 * 2 ** 32 + 1215752192),
                retailerId: "IZUMI",
                url: "https://linkbio.co/naruyaizumi",
                productImageCount: 5,
                signedUrl:
                    "https://l.wl.co/l/?u=https%3A%2F%2Flinkbio.co%2Fnaruyaizumi&e=AT065QDZzUpFex4H3JaKX1B3jFxLs90G3NEOHbP-LeDGmNM4QfwzF76CAPV6ODSxeErfWu-ZjaaihkWeRUJcUKOdiAfCTnSh3v8uQMqc2-eqKvM8EYzip2AAR-5GsbNJH16tEQ",
            },
            businessOwnerJid: "113748182302861@lid",
            footer: txt,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363144038483540@newsletter",
                    newsletterName: "mkfs.ext4 /dev/naruyaizumi",
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
handler.help = ["script"];
handler.tags = ["info"];
handler.command = /^(script|sc)$/i;

export default handler;
