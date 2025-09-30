let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `🎸 *Masukkan judul lagu untuk mencari chord!*\n📌 *Contoh: ${usedPrefix + command} Bawa dia kembali*`
            );
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/search/chord", { song: text }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok) return m.reply("⚠️ *Terjadi kesalahan dalam pencarian chord!*");
        let json = await response.json();
        if (!json.result) return m.reply("⚠️ *Chord tidak ditemukan atau terjadi kesalahan!*");
        let { title, chord } = json.result;
        let caption = `
🎵 *Chord Lagu: ${title}*
🎸 *Kunci Gitar:*
\`\`\`
${chord}
\`\`\`
`.trim();
        await conn.sendMessage(
            m.chat,
            {
                text: caption,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi Kesalahan!*\n⚠️ *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["chord"];
handler.tags = ["music"];
handler.command = /^(chord|kunci)$/i;

export default handler;
