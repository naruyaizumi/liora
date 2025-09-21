let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `❌ *Harap masukkan nama kota!*\n\n📌 *Contoh: ${usedPrefix + command} jakarta*`
            );
        await global.loading(m, conn);
        let res = await fetch(
            global.API("btz", "/api/tools/jadwalshalatv2", { kota: text }, "apikey")
        );
        let json = await res.json();
        if (!json.status || !json.result) return m.reply("❌ *Gagal mengambil jadwal sholat!*");
        let r = json.result;
        let isi = `🕌 *Jadwal Sholat - ${text.toUpperCase()}*
📅 *Tanggal: ${new Date().toLocaleDateString("id-ID")}*
━━━━━━━━━━━━━━━━━━━
🕓 *Imsak: ${r.Imsak}*
🌙 *Subuh: ${r.Fajr}*
🌄 *Terbit: ${r.Sunrise}*
☀️ *Dzuhur: ${r.Dhuhr}*
🕒 *Ashar: ${r.Asr}*
🌆 *Maghrib: ${r.Maghrib}*
🌌 *Isya: ${r.Isha}*
━━━━━━━━━━━━━━━━━━━
🌓 *Pertengahan Malam: ${r.Midnight}*
🌗 *Sepertiga Awal: ${r.Firstthird}*
🌘 *Sepertiga Akhir: ${r.Lastthird}*
━━━━━━━━━━━━━━━━━━━`;
        await conn.sendMessage(
            m.chat,
            {
                image: { url: "https://files.catbox.moe/3fecs2.jpg" },
                caption: isi,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("❌ *Gagal mengambil jadwal sholat! Coba lagi nanti.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["jadwalsholat"];
handler.tags = ["islami"];
handler.command = /^(jadwalsholat)$/i;

export default handler;
