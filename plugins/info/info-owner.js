let handler = async (m, { conn }) => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:Naruya Izumi
ORG:Naruya Izumi
TITLE:Epictetus, Enchiridion — Chapter 1 (verse 1)
EMAIL;type=INTERNET:sexystyle088@gmail.com
TEL;type=CELL;waid=31629155460:+31629155460
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
                vcard,
            },
        },
    };

    await conn.sendMessage(
        m.chat,
        {
            contacts: {
                displayName: "Naruya Izumi",
                contacts: [{ vcard }],
            },
            contextInfo: {
                externalAdReply: {
                    title: "© 2024–2025 Liora Project",
                    body: "Contact the Owner via WhatsApp",
                    thumbnailUrl: "https://qu.ax/RFEvm.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: q }
    );
};

handler.help = ["owner"];
handler.tags = ["info"];
handler.command = /^(owner|creator)$/i;

export default handler;
