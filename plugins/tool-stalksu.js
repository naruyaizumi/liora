
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`🍰 *Contoh: ${usedPrefix + command} 20431364*`)
await global.loading(m, conn)
try {
let res = await fetch(global.API('btz', '/api/stalk/supersus', { id: text }, 'apikey'))
if (!res.ok) throw '❌ Tidak bisa mengakses data SuperSus.'
let json = await res.json()
if (!json.status || !json.result) throw '🙈 Data tidak ditemukan.'
let { name, account, userId, spaceId, sex, cupNum, device } = json.result
let caption = `
🍓 *SUPERSUS STALKER*
🧁 *Nama: ${name}*
🍰 *Username: ${account}*
🍬 *User ID: ${userId}*
🍪 *Space ID: ${spaceId}*
🍩 *Gender: ${sex == 1 ? 'Laki-laki' : sex == 2 ? 'Perempuan' : 'Tidak diketahui'}*
🍮 *Piala: ${cupNum}*
🍫 *Device ID: ${device}*
`.trim()
await conn.sendFile(m.chat, 'https://telegra.ph/file/bbaf91e294fd9021ae30d.jpg', 'supersus.jpg', caption, m)
} catch (e) {
console.error(e)
m.reply(typeof e === 'string' ? e : '🥀 Gagal mengambil data SuperSus.')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['stalksu']
handler.tags = ['tools']
handler.command = /^(stalksu|sustalk)$/i
handler.register = true

export default handler