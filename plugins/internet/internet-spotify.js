let handler = async (m, { conn, args, usedPrefix }) => {
    if (!args[0]) {
        return m.reply("🍣 *Masukkan nama lagu atau artis untuk dicari di Spotify!* 🍣");
    }
    let query = args.join(" ");
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/search/spotify", { query }, "apikey"));
        let json = await res.json();
        if (
            !json.result ||
            !json.result.data ||
            !Array.isArray(json.result.data) ||
            json.result.data.length === 0
        ) {
            return m.reply("🍜 *Tidak ada hasil ditemukan!*");
        }
        let sections = [
            {
                title: `🍱 Hasil Pencarian untuk: ${query}`,
                rows: [],
            },
        ];
        for (let i = 0; i < json.result.data.length; i++) {
            let v = json.result.data[i];
            sections[0].rows.push({
                title: `${v.title}`,
                header: "🍙 Spotify Downloader",
                description: `🥟 Durasi: ${v.duration} | 🍤 Popularitas: ${v.popularity}`,
                id: `${usedPrefix}spotifydl ${v.url}`,
            });
        }
        await conn.sendMessage(
            m.chat,
            {
                image: { url: "https://i.ibb.co.com/WvvGn72q/IMG-20250923-WA0061.jpg" },
                caption: `🍛 *Ditemukan ${json.result.data.length} hasil pencarian:*\n\n🍡 *Silakan pilih lagu dari daftar di bawah ini untuk diunduh.*`,
                footer: "🍩 Tekan tombol di bawah untuk melihat pilihan.",
                title: "🍱 Spotify Downloader",
                interactiveButtons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "🍙 Pilih Lagu",
                            sections: sections,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("🍤 *Gagal melakukan pencarian.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotify"];
handler.tags = ["internet"];
handler.command = /^(spotify)$/i;

export default handler;
