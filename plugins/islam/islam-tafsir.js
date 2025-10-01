let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `🍙 *Masukkan kata kunci ayat atau nama surah!* \n📌 *Contoh: ${usedPrefix + command} adam*`
        );
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/muslim/tafsirsurah", { text }, "apikey"));
        if (!res.ok) throw new Error("🍤 *Gagal mengambil data tafsir dari API!*");
        let json = await res.json();
        if (!json.result || json.result.length === 0)
            return m.reply("🍜 *Tidak ada tafsir ditemukan!*");
        let random = json.result[Math.floor(Math.random() * json.result.length)];
        let teks = `
🍩 *${random.surah}*
🍬 *Tafsir:* ${random.tafsir}
🔗 *Sumber: ${random.source}*
`.trim();
        await conn.sendMessage(m.chat, { text: teks }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply("🍡 *Terjadi kesalahan saat mengambil data tafsir!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tafsir"];
handler.tags = ["islam"];
handler.command = /^(tafsir)$/i;

export default handler;
