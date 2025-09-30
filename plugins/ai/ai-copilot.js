let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `🍩 *Masukkan pertanyaan untuk Copilot AI!*\n\n🍰 *Contoh: ${usedPrefix + command} Apa itu relativitas waktu?*`
            );
        await global.loading(m, conn);

        let apiUrl = global.API("btz", "/api/search/bing-chat", { text }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok)
            return m.reply(
                "🍪 *Gagal memproses permintaan ke Copilot AI. Coba beberapa saat lagi.*"
            );

        let json = await response.json();
        if (!json.message)
            return m.reply("🍬 *Copilot tidak memberikan jawaban. Coba pertanyaan lain ya.*");

        await conn.sendMessage(
            m.chat,
            {
                text: `🍓 *Copilot AI:*\n\n${json.message}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Copilot AI",
                        body: "Jawaban dari Copilot",
                        thumbnailUrl: "https://qu.ax/Mwdrk.jpg",
                        sourceUrl: "https://copilot.microsoft.com/",
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`🍮 *Terjadi Kesalahan Teknis!*\n🍭 *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["copilot"];
handler.tags = ["ai"];
handler.command = /^(copilot)$/i;

export default handler;
