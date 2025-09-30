let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return conn.reply(
            m.chat,
            `🍙 *Masukkan kata kunci video TikTok!*\n\n🍱 *Contoh: ${usedPrefix + command} anime*`,
            m
        );
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/search/tiktoks", { query: text }, "apikey"));
        let json = await res.json();
        let results = json.result?.data;
        if (!results || results.length === 0) throw "🍜 *Tidak ada hasil ditemukan di TikTok!*";
        let cards = [];
        for (let i = 0; i < Math.min(10, results.length); i++) {
            let item = results[i];
            let toMinuteSecond = (sec) => {
                let m = Math.floor(sec / 60);
                let s = sec % 60;
                return `${m}m ${s}d`;
            };
            let caption = `
🍙 *Author: ${item.author?.nickname}*
🍤 *Durasi: ${toMinuteSecond(item.duration)}*
🍢 *Views: ${item.play_count.toLocaleString()}*
❤️ *Likes: ${item.digg_count.toLocaleString()}*
💬 *Komentar: ${item.comment_count.toLocaleString()}*
`.trim();
            cards.push({
                video: { url: item.play },
                title: `🍘 ${i + 1}. ${item.title.trim() || "Tanpa Judul"}`,
                body: caption,
                footer: `🍡 Klik tombol untuk menonton atau ambil audio`,
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍱 Tonton Video",
                            url: item.play,
                        }),
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍩 Ambil Audio",
                            url: item.music,
                        }),
                    },
                ],
            });
        }
        await conn.sendMessage(
            m.chat,
            {
                text: `🍰 *Hasil Pencarian TikTok: ${text}*`,
                title: `🍙 TikTok Search`,
                subtitle: "",
                footer: `🍜 Pilih salah satu hasil di bawah ini`,
                cards,
            },
            { quoted: m }
        );
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
