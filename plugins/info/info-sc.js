let handler = async (m, { conn }) => {
    const timestamp = new Date().toTimeString().split(" ")[0];

    const text = [
        "```",
        `[${timestamp}] Liora Repository`,
        "────────────────────────────",
        "Project Script Izumi",
        "",
        "Repository : https://github.com/naruyaizumi/liora",
        "Report Bug : https://github.com/naruyaizumi/liora/issues",
        "Pull Req   : https://github.com/naruyaizumi/liora/pulls",
        "",
        "────────────────────────────",
        "© 2024 – 2025 Naruya Izumi • All Rights Reserved",
        "```",
    ].join("\n");

    await conn.sendMessage(
        m.chat,
        {
            text,
            contextInfo: {
                externalAdReply: {
                    title: "Liora — WhatsApp Bot",
                    body: "GitHub Repository",
                    thumbnailUrl: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg",
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
