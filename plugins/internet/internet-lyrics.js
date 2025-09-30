let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `🎶 *Masukkan judul atau potongan lirik lagu!*\n📌 *Contoh: ${usedPrefix + command} Bawa dia kembali*`
            );
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/search/lirik", { lirik: text }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok) return m.reply("⚠️ *Terjadi kesalahan dalam pencarian lirik!*");
        let json = await response.json();
        if (!json.result) return m.reply("⚠️ *Lirik tidak ditemukan atau terjadi kesalahan!*");
        let { lyrics, title, artist, image, url } = json.result;
        let caption = `
🎵 *Lirik Lagu: ${title}*
🎤 *Artis: ${artist}*
━━━━━━━━━━━━━━━━━━━
📜 *Lirik:*
${lyrics}
━━━━━━━━━━━━━━━━━━━
🔗 *Sumber: ${url}*
`.trim();
        await conn.sendMessage(
            m.chat,
            {
                text: caption,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: `Lagu dari ${artist}`,
                        thumbnailUrl: image,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
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

handler.help = ["lyrics"];
handler.tags = ["internet"];
handler.command = /^(lyrics|lirik)$/i;

export default handler;
