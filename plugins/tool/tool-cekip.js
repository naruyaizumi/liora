let handler = async (m, { args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(`📦 *Contoh penggunaan: ${usedPrefix + command} google.com*`);
    let domain = args[0]
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0];
    let response = await fetch(`http://ip-api.com/json/${domain}`);
    let res = await response.json();
    if (res.status !== "success") return m.reply(`❌ *IP untuk domain ${domain} tidak ditemukan!*`);
    let teks = `🌐 *Informasi IP Domain* 🌐
────────────────────
🔍 *Query: ${res.query}*
🌍 *Negara: ${res.country} (${res.countryCode})*
📍 *Wilayah: ${res.regionName} (${res.region})*
🏙️ *Kota: ${res.city}*
🏷️ *ZIP: ${res.zip}*
🧭 *Latitude: ${res.lat}*
🧭 *Longitude: ${res.lon}*
🕒 *Zona Waktu: ${res.timezone}*
🧠 *ISP: ${res.isp}*
💼 *Organisasi: ${res.org}*
📡 *AS: ${res.as}*`.trim();
    await m.reply(teks);
};

handler.help = ["cekip"];
handler.tags = ["tools"];
handler.command = /^(cekip|ip)$/i;

export default handler;
