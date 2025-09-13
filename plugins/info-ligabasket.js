
const API_KEY = "cf8bedebf28da6cd9e75dbc807d0b483";
const BASE_URL = "https://v1.basketball.api-sports.io/leagues";
const HEADERS = {
  "x-rapidapi-key": API_KEY,
  "x-rapidapi-host": "v1.basketball.api-sports.io"
};

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    await global.loading(m, conn)

    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: HEADERS,
      timeout: 20000
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const { response: leagues } = await response.json();
    if (!leagues?.length) return m.reply("*⚠ Data liga tidak tersedia*");

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `*🏀 DAFTAR LIGA BASKET TERKINI*\n`;
    message += `*📅 Update:* ${formattedDate}\n\n`;
    
    const topLeagues = leagues
      .filter(league => league?.name && league?.country)
      .slice(0, 15);

    topLeagues.forEach((league, index) => {
      message += `*${index + 1}. ${league.name.toUpperCase()}*\n`;
      message += `   • 🌍 ${league.country.name || 'Internasional'}\n`;
      message += `   • 🏆 ${league.type || 'Liga Profesional'}\n`;
      message += `   • 🔄 Musim ${league.season || currentDate.getFullYear()}\n`;
      message += `   • 🏟 ${league.season_type || 'Regular Season'}\n\n`;
    });

    message += `*ℹ️ Gunakan perintah dibawah untuk info lebih lanjut:*\n`;
    message += `*${usedPrefix}infobasket <nama_liga>*\n`;
    message += `Contoh: *${usedPrefix}infobasket NBA*`;

    await conn.sendMessage(m.chat, { text: message }, { quoted: m });

  } catch (error) {
    console.error('Error:', error);
    await m.reply(
      `*❌ GAGAL MEMUAT DATA*\n\n` +
      `*Penyebab:* ${error.message}\n\n` +
      `*Solusi:*\n` +
      `• Coba beberapa menit lagi\n` +
      `• Periksa koneksi internet\n` +
      `• Gunakan nama liga yang tepat`
    );
  }
};

handler.help = ["ligabasket"];
handler.tags = ["info"];
handler.command = /^(ligabasket|infobasket|daftarliga)$/i;
handler.limit = true;
handler.premium = false;

export default handler;