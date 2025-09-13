
let handler = async (m, { conn, args, text, usedPrefix, command }) => {
if (command === 'vccgen' || command === 'vccgenerator') {
let jumlah = args[0] || '10'
await conn.reply(m.chat, '🍭 *Tunggu sebentar yaa…*', m)
try {
let apiUrl = global.API('btz', '/api/tools/vccgen', { jumlah }, 'apikey')
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status) throw new Error('Gagal membuat VCC')
await conn.reply(m.chat, `🍰 *VCC Berhasil Dibuat:*\n${json.result}`, m)
} catch (e) {
console.error(e)
await conn.reply(m.chat, '⚠️ *Gagal generate VCC, coba lagi nanti*', m)
}
}
if (command === 'fakeaddress' || command === 'addressgenerator') {
if (!text) {
await conn.reply(m.chat, '🍭 *Mengambil daftar negara…*', m)
try {
let apiUrl = global.API('btz', '/api/tools/random-address', {}, 'apikey')
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status) throw new Error('Gagal mengambil daftar negara')
let daftar = json.result
let caption = '🍰 *Daftar Negara yang Tersedia:*\n\n'
daftar.forEach((c, i) => {
caption += `${i + 1}. ${c.name}\n`
})
caption += `\n🍭 *Gunakan: ${usedPrefix + command} nama_negara*`
await conn.reply(m.chat, caption.trim(), m)
} catch (e) {
console.error(e)
await conn.reply(m.chat, '⚠️ *Gagal mengambil daftar negara*', m)
}
} else {
await conn.reply(m.chat, '🍭 *Membuat alamat acak…*', m)
try {
let apiUrl = global.API('btz', '/api/tools/random-address', { country: text }, 'apikey')
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status) throw new Error('*Gagal membuat alamat*')
let r = json.result
let caption = `
🍰 *Random Address Generator*
────────────────────────────
🏷️ *Nama: ${r.Name}*
🚻 *Gender: ${r.Gender}*
🎂 *Lahir: ${r['Date of Birth']}*
🏡 *Alamat: ${r.Street}, ${r['City/Town']}*
📮 *Kode Pos: ${r['Zip/Postal Code']}*
🌍 *Negara: ${r.Country}*
📱 *Telepon: ${r['Phone Number']}*
📧 *Email: ${r['email-address']}*
📏 *Berat Badan: ${r.Weight}*
`.trim()
await conn.reply(m.chat, caption, m)
} catch (e) {
console.error(e)
await conn.reply(m.chat, '⚠️ *Gagal membuat alamat acak*', m)
}
}
}
}

handler.help = ['vccgen','vccgenerator','fakeaddress','addressgenerator']
handler.tags = ['tools']
handler.command = /^(vccgen|vccgenerator|fakeaddress|addressgenerator)$/i
handler.register = true
handler.limit = true

export default handler