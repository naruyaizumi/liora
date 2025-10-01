let handler = async (m, { conn }) => {
    let vcard = `BEGIN:VCARD
VERSION:3.0
FN:𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊
ORG:𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊
TITLE:Metatron Executioner of Michael
EMAIL;type=INTERNET:sexystyle088@gmail.com
TEL;type=CELL;waid=31629155460:+31629155460
ADR;type=WORK:;;2-chōme-7-5 Fuchūchō;Izumi;Osaka;594-0071;Japan
URL;type=WORK:https://www.instagram.com/naruyaizumi
X-WA-BIZ-NAME:𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊
X-WA-BIZ-DESCRIPTION:𝐓𝐡𝐞 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐫 𝐎𝐟 𝐋𝐢𝐨𝐫𝐚
X-WA-BIZ-HOURS:Mo-Su 00:00-23:59
END:VCARD`;

    let qkontak = {
        key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
        message: { contactMessage: { displayName: "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", vcard } },
    };

    await conn.sendMessage(
        m.chat,
        {
            contacts: { displayName: "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", contacts: [{ vcard }] },
            contextInfo: {
                externalAdReply: {
                    title: "Copyright © 2024 - 2025 Liora",
                    body: "Hubungi langsung lewat WhatsApp",
                    thumbnailUrl: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: qkontak }
    );
    let team = global.config.owner.filter(([num]) => num !== "31629155460");
    if (team.length) {
        let vcards = team.map(([num, name]) => ({
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;type=CELL;waid=${num}:${num}
END:VCARD`,
        }));

        await conn.sendMessage(
            m.chat,
            {
                contacts: {
                    displayName: "Liora Team",
                    contacts: vcards,
                },
            },
            { quoted: qkontak }
        );
    }
};

handler.help = ["owner"];
handler.tags = ["info"];
handler.command = /^(owner|creator)$/i;

export default handler;
