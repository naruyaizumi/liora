let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return conn.reply(
            m.chat,
            `🍙 *Masukkan kata kunci video TikTok!*\n\n🍱 *Contoh: ${usedPrefix + command} anime*`,
            m
        );
    }

    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/search/tiktoks", { query: text }, "apikey"));
        let json = await res.json();
        let results = json.result?.data;
        if (!results || results.length === 0) throw "🍜 *Tidak ada hasil ditemukan di TikTok!*";

        results = results.slice(0, 50);

        const toMinuteSecond = (sec) => {
            let m = Math.floor(sec / 60);
            let s = sec % 60;
            return `${m}m ${s}s`;
        };

        let album = results.map((item, i) => ({
            video: { url: item.play },
            caption: `
🍙 Hasil TikTok ${i + 1}/${results.length}
🍘 Judul: ${item.title?.trim() || "Tanpa Judul"}
🍤 Durasi: ${toMinuteSecond(item.duration)}
🍢 Views: ${item.play_count.toLocaleString()}
❤️ Likes: ${item.digg_count.toLocaleString()}
💬 Komentar: ${item.comment_count.toLocaleString()}
`.trim(),
        }));

        await conn.sendMessage(m.chat, { album }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply("🍵 *Terjadi kesalahan saat mengambil data dari TikTok.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ttsearch"];
handler.tags = ["internet"];
handler.command = /^(ttsearch)$/i;

export default handler;