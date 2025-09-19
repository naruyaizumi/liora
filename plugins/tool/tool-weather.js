let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply('🍭 *Masukkan nama desa/kelurahan ya sayang, misalnya "Senen"*')
let keyword = args.join(' ').toLowerCase()
let keywords = keyword.split(',').map(k => k.trim())
let res = await fetch('https://raw.githubusercontent.com/kodewilayah/permendagri-72-2019/main/dist/base.csv')
let csv = await res.text()
let lines = csv.trim().split('\n').map(r => r.split(','))
let kodeNamaMap = Object.fromEntries(lines)
let wilayahLengkap = lines
.filter(([kode]) => kode.split('.').length === 4)
.map(([kode, nama]) => {
let parts = kode.split('.')
let kecamatan = kodeNamaMap[parts.slice(0, 3).join('.')] || ''
let kabupaten = kodeNamaMap[parts.slice(0, 2).join('.')] || ''
let provinsi = kodeNamaMap[parts[0]] || ''
let full = [nama, kecamatan, kabupaten, provinsi].filter(Boolean).join(', ')
return [kode, full.toLowerCase()]
})
let [kode] = wilayahLengkap.find(([, full]) => {
  return keywords.every(k => full.includes(k))
}) || []
if (!kode) return m.reply('🍬 *Maaf, lokasi tidak ditemukan. Coba tulis lengkap, misalnya "Senen, Jakarta Pusat, DKI Jakarta"*')
let resCuaca = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${kode}`)
let data = await resCuaca.json()
let lokasi = data.lokasi
let cuaca = data.data[0].cuaca.flat().slice(0, 4)
let penjelasan = cuaca.map(w => {
let jam = w.local_datetime.split(' ')[1]
return `🕒 *${jam} WIB*
🌤️ *Cuaca: ${w.weather_desc}*
🌡️ *Suhu: ${w.t}°C*
💧 *Kelembaban: ${w.hu}%*
💨 *Angin: ${w.ws} km/jam* (${w.wd})
👀 *Jarak Pandang: ${w.vs_text}*`
}).join('\n\n')
let caption = `📡 *Prakiraan Cuaca BMKG*
📍 *${lokasi.desa}, ${lokasi.kecamatan}, ${lokasi.provinsi}*

${penjelasan}
━━━━━━━━━━━━━━
🌸 *Sumber: BMKG.go.id*`
await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
}

handler.help = ['cuaca']
handler.tags = ['tools']
handler.command = /^(cuaca)$/i

export default handler