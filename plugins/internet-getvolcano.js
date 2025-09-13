
let handler = async (m, { conn, text, usedPrefix, command }) => {
await global.loading(m, conn)
try {
let query = text ? `?name=${encodeURIComponent(text)}` : '?type=kompleks'
let res = await fetch('http://indonesia-public-static-api.vercel.app/api/volcanoes' + query)
if (!res.ok) throw '*Gagal mengambil data gunung*'
let volcanoes = await res.json()
if (!volcanoes.length) throw '*Tidak ada gunung ditemukan dengan nama itu*'
let hasil = volcanoes.map((v, i) => 
`🌋 *${i + 1}. ${v.nama || 'Nama tidak tersedia'}*
*▸ Bentuk: ${v.bentuk || '-'}*
*▸ Tinggi: ${v.tinggi_meter || '-'} meter*
*▸ Letusan Terakhir: ${v.estimasi_letusan_terakhir || '-'}*
*▸ Geolokasi: ${v.geolokasi || '-'}*`).join('\n\n━━━━━━━━━━━━━━\n\n')
await conn.reply(m.chat, `🌋 *HASIL PENCARIAN GUNUNG BERAPI*\n\n${hasil}`, m)
} catch (e) {
console.log(e)
await conn.reply(m.chat, `❌ *Gagal mengambil data gunung*\n*Alasan:* ${e}`, m)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['gunung']
handler.tags = ['internet']
handler.command = /^(gunung)$/i
handler.limit = true
handler.register = true

export default handler