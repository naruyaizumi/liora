let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("🍩 *Masukkan kata kunci untuk mencari gambar di Bing!*");
    try {
        await global.loading(m, conn);
        const apiUrl = global.API("btz", "/api/search/bing-img", { text }, "apikey");
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        const json = await response.json();
        if (!json.result || json.result.length === 0)
            return m.reply("🍪 *Tidak ada hasil untuk kata kunci tersebut!*");
        const images = json.result.slice(0, 10);

        let cards = [];
        for (let i = 0; i < images.length; i++) {
            cards.push({
                image: { url: images[i] },
                title: `🍰 *Bing Image (${i + 1}/${images.length})*`,
                body: `🍬 Kata Kunci: ${text}`,
                footer: "🍡 Klik tombol untuk lihat gambar",
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍙 Lihat Gambar",
                            url: images[i],
                            merchant_url: "https://www.bing.com",
                        }),
                    },
                ],
            });
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `🍜 *Hasil Pencarian Bing: ${text}*`,
                title: "🍧 Bing Image Search",
                subtitle: "",
                footer: "🍬 Klik tombol untuk melihat gambar",
                cards,
            },
            { quoted: m }
        );
    } catch (error) {
        console.error(error);
        m.reply("🍬 *Terjadi kesalahan saat mengambil data dari Bing Image. Coba lagi nanti!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bingimg"];
handler.tags = ["ai"];
handler.command = /^(bingimg|bingimage)$/i;

export default handler;
