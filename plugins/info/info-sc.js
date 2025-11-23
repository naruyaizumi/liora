let handler = async (m, { conn }) => {
    const text = `
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

    await conn.sendMessage(
        m.chat,
        {
            product: {
                productImage: {
                    url: "https://qu.ax/WGRQE.jpg",
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
            footer: text,
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

handler.help = ["script"];
handler.tags = ["info"];
handler.command = /^(script|sc)$/i;

export default handler;
