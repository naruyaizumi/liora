let handler = async (m, { conn }) => {
    let vcard = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`;
    let qkontak = {
        key: {
            fromMe: false,
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            contactMessage: {
                displayName: "Meta Ai",
                vcard,
            },
        },
    };

    await conn.sendMessage(
        m.chat,
        {
            image: { url: "https://i.ibb.co.com/WvvGn72q/IMG-20250923-WA0061.jpg" },
            caption:
                "🍙 *Project Script Izumi* 🍙\n" +
                "📂 *Repository: Source code resmi Liora*\n" +
                "✨ *Jangan lupa kasih ⭐ di repo kalau suka ya!*",
            title: "🍡 Liora — WhatsApp Bot",
            subtitle: "",
            footer: "*© 2024 – 2025 Naruya Izumi*\n*All Rights Reserved*",
            interactiveButtons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🌐 GitHub Repo",
                        url: "https://github.com/naruyaizumi/liora",
                        merchant_url: "https://github.com/naruyaizumi/liora",
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🐛 Report Issue",
                        url: "https://github.com/naruyaizumi/liora/issues",
                        merchant_url: "https://github.com/naruyaizumi/liora/issues",
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🔧 Pull Request",
                        url: "https://github.com/naruyaizumi/liora/pulls",
                        merchant_url: "https://github.com/naruyaizumi/liora/pulls",
                    }),
                },
            ],
            hasMediaAttachment: true,
        },
        { quoted: qkontak }
    );
};

handler.help = ["script"];
handler.tags = ["info"];
handler.command = /^(script|sc)$/i;

export default handler;
