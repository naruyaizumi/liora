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
        const albumItems = json.result.slice(0, 50).map((img, i) => ({
            image: { url: img },
            caption: `🍰 Bing Image Result (${i + 1}/${json.result.length})\n🍬 Kata Kunci: ${text}`,
        }));
        await conn.sendMessage(m.chat, { album: albumItems }, { quoted: m });
    } catch (error) {
        console.error(error);
        m.reply("🍬 *Terjadi kesalahan saat mengambil data dari Bing Image. Coba lagi nanti!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bingimg"];
handler.tags = ["internet"];
handler.command = /^(bingimg|bingimage)$/i;

export default handler;