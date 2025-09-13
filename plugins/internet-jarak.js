
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`🗺️ *Contoh: ${usedPrefix + command} cilacap,tasikmalaya*`)
let [from, to] = text.split(',').map(v => v.trim())
if (!from || !to) return m.reply(`🗺️ *Contoh: ${usedPrefix + command} cilacap,tasikmalaya*`)
let url = `https://api.betabotz.eu.org/api/search/jarak?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=naruyaizumi`
let res = await fetch(url)
let json = await res.json()
if (!json?.status || !json?.message) return m.reply(`⛔ *Gagal mengambil data. Pastikan penulisan lokasi benar.*`)
let data = json.message
await conn.sendMessage(m.chat, {
location: {
degreesLatitude: data.asal.koordinat.lat,
degreesLongitude: data.asal.koordinat.lon
}
}, { quoted: m })
let arahs = data.arah_penunjuk_jalan.map(v => `*#${v.langkah}. ${v.instruksi} (${v.jarak})*`).join('\n')
await conn.sendFile(m.chat, data.peta_statis, 'map.jpg', `
🌍 *Perjalanan dari ${data.asal.nama} ke ${data.tujuan.nama}*
────────────────────────
📍 *Asal: ${data.asal.alamat}*
🎯 *Tujuan: ${data.tujuan.alamat}*
🌐 *Negara Asal: ${data.asal.negara} (${data.asal.kode_negara})*
🌐 *Negara Tujuan: ${data.tujuan.negara} (${data.tujuan.kode_negara})*

📏 *Jarak: ${data.detail.split('jarak')[1].split(',')[0].trim()}*
⏱️ *Estimasi: ${data.detail.split('estimasi waktu')[1].replace('.', '').trim()}*
⛽ *BBM: ${data.estimasi_biaya_bbm.total_liter} Liter — ${data.estimasi_biaya_bbm.total_biaya}*
────────────────────────
🧭 *Rute OpenStreetMap: ${data.rute}*
────────────────────────
🧾 *Arahan Jalur:*

${arahs}
`.trim(), m)
}

handler.help = ['jarak']
handler.tags = ['internet']
handler.command = /^(jarak|peta)$/i
export default handler