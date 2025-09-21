let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("🍙 *Masukkan kata kunci untuk mencari gambar di Google!*");
    await global.loading(m, conn);
    try {
        let res = await fetch(
            global.API("btz", "/api/search/googleimage", { text1: text }, "apikey")
        );
        let json = await res.json();
        if (!json.result || json.result.length === 0)
            return m.reply("🍤 *Tidak ada hasil ditemukan di Google Image!*");
        let images = json.result.slice(0, 10);
        let cards = [];
        for (let i = 0; i < images.length; i++) {
            cards.push({
                image: { url: images[i].url },
                title: `🍱 *Google Image (${i + 1}/${images.length})*`,
                body: `🍜 *Ukuran: ${images[i].width}x${images[i].height}*`,
                footer: "",
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍡 Lihat Gambar",
                            url: images[i].url,
                            merchant_url: "https://images.google.com",
                        }),
                    },
                ],
            });
        }
        await conn.sendMessage(
            m.chat,
            {
                text: `🍘 *Hasil Pencarian Google: ${text}*`,
                title: "🍙 *Google Image Search*",
                subtitle: "",
                footer: "🍢 Klik tombol untuk melihat gambar lebih besar~",
                cards,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("🍩 *Terjadi kesalahan saat mengambil data dari Google Image.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["googleimage"];
handler.tags = ["search"];
handler.command = /^(googleimage|gimage)$/i;

export default handler;
