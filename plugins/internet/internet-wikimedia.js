let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("🍜 *Masukkan kata kunci untuk mencari gambar di Wikimedia!*");
    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/search/wikimedia", { text1: text }, "apikey");
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        const json = await response.json();

        if (!json.result || json.result.length === 0)
            return m.reply("🍣 *Tidak ada hasil untuk kata kunci tersebut!*");

        const results = json.result.slice(0, 50);
        let albumItems = results.map((item, i) => ({
            image: { url: item.image },
            caption: `🍱 Wikimedia Result (${i + 1}/${results.length})\n🍙 ${item.title}\n🍤 [Sumber](${item.source})`,
        }));

        await conn.sendAlbumMessage(m.chat, albumItems, { quoted: m, delay: 500 });
    } catch (error) {
        console.error(error);
        m.reply("🍡 *Terjadi kesalahan saat mengambil data dari Wikimedia. Coba lagi nanti!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["wikimedia"];
handler.tags = ["internet"];
handler.command = /^(wikimedia)$/i;

export default handler;
