let handler = async (m, { conn }) => {
    let caption = `🍙 *Project Script Izumi* 🍙

📂 *Repository:*
*https://github.com/naruyaizumi/liora*

🐛 *Report Issue:*
*https://github.com/naruyaizumi/liora/issues*

🔧 *Pull Request:*
*https://github.com/naruyaizumi/liora/pulls*

✨ *Jangan lupa kasih ⭐ di repo ya!*`;

    await conn.sendMessage(m.chat, {
        text: caption,
        contextInfo: {
            externalAdReply: {
                title: "🍡 Liora — WhatsApp Bot",
                body: "© 2024 – 2025 Naruya Izumi | All Rights Reserved",
                thumbnailUrl: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg",
                sourceUrl: "https://github.com/naruyaizumi/liora",
                mediaType: 1,
                renderLargerThumbnail: true,
            },
        },
    });
};

handler.help = ["script"];
handler.tags = ["info"];
handler.command = /^(script|sc)$/i;

export default handler;