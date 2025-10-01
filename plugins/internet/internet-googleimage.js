let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("🍙 *Masukkan kata kunci untuk mencari gambar di Google!*");
    await global.loading(m, conn);

    try {
        let res = await fetch(
            global.API("btz", "/api/search/googleimage", { text1: text }, "apikey")
        );
        let json = await res.json();

        if (!json.result || json.result.length === 0) {
            return m.reply("🍤 *Tidak ada hasil ditemukan di Google Image!*");
        }

        let results = json.result.slice(0, 50);

        let album = results.map((img, i) => ({
            image: { url: img.url },
            caption: `🍱 Google Image (${i + 1}/${results.length})\n🍜 Ukuran: ${img.width}x${img.height}`,
        }));

        await conn.sendMessage(m.chat, { album }, { quoted: m });
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