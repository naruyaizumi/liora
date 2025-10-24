let handler = async (m, { conn }) => {
    const text = `
Liora Repository

Project Script Izumi
Repository: https://github.com/naruyaizumi/liora
Report Bug: https://github.com/naruyaizumi/liora/issues
Pull Req: https://github.com/naruyaizumi/liora/pulls

© 2024 – 2025 Naruya Izumi • All Rights Reserved
    `.trim();

    await conn.sendMessage(
        m.chat,
        {
            text,
            contextInfo: {
                externalAdReply: {
                    title: "Liora — WhatsApp Bot",
                    body: "GitHub Repository",
                    thumbnailUrl: "https://qu.ax/cOOdr.jpg",
                    sourceUrl: "https://github.com/naruyaizumi/liora",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
};

handler.help = ["script"];
handler.tags = ["info"];
handler.command = /^(script|sc)$/i;

export default handler;