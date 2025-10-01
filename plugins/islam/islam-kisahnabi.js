let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(`🍱 *Masukkan nama nabi!*\n🍜 *Contoh: ${usedPrefix + command} muhammad*`);
    await global.loading(m, conn);
    try {
        let apiUrl = global.API("btz", "/api/muslim/kisahnabi", { nabi: text }, "apikey");
        let res = await fetch(apiUrl);
        if (!res.ok) throw new Error("🍙 *Gagal mengambil data dari API!*");
        let json = await res.json();
        if (!json.result)
            return m.reply("🍤 *Kisah tidak ditemukan!*\n📮 *Tips: gunakan huruf kecil semua.*");
        let kisah = json.result;
        let hasil = `
👳 *Nabi: ${kisah.name}*
📅 *Kelahiran: ${kisah.kelahiran}*
📊 *Usia Wafat: ${kisah.wafat_usia}*
📍 *Tempat Singgah: ${kisah.singgah}*

🍡 *Kisah:* 
${kisah.kisah}
`.trim();
        await conn.sendMessage(m.chat, { text: hasil }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply("🍢 *Terjadi kesalahan saat mengambil kisah nabi.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["kisahnabi"];
handler.tags = ["islam"];
handler.command = /^(kisahnabi)$/i;

export default handler;
