let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `🍩 *Masukkan pertanyaan untuk Bing Chat AI!*\n\n🍰 *Contoh: ${usedPrefix + command} Apa itu relativitas waktu?*`
            );
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/search/bing-chat", { text }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok)
            return m.reply(
                "🍪 *Gagal memproses permintaan ke Bing Chat. Coba beberapa saat lagi.*"
            );
        let json = await response.json();
        if (!json.message)
            return m.reply("🍬 *Bing tidak memberikan jawaban. Coba pertanyaan lain ya.*");
        await conn.sendMessage(
            m.chat,
            {
                text: `🍓 *Bing AI:*\n\n${json.message}`,
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

handler.help = ["bingchat"];
handler.tags = ["ai"];
handler.command = /^(bing|bingchat)$/i;

export default handler;
