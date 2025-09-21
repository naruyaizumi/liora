let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `🍮 *Masukkan pertanyaan untuk Bard AI!*\n\n📌 *Contoh: ${usedPrefix + command} Jelaskan teori relativitas!*`
            );
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/search/bard-ai", { text }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok) return m.reply("🍫 *Ups! Gagal mengakses Bard. Coba lagi nanti ya~*");
        let json = await response.json();
        if (!json.message)
            return m.reply("🍪 *Bard AI belum bisa jawab sekarang. Coba lagi nanti ya~*");
        await conn.sendMessage(
            m.chat,
            {
                text: `🍰 *Bard AI:*\n\n🍬 ${json.message}`,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi Kesalahan Teknis!*\n🍯 *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bard"];
handler.tags = ["ai"];
handler.command = /^(bard)$/i;
handler.limit = true;
handler.register = true;

export default handler;
