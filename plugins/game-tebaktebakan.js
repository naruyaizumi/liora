
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebaktebakan = conn.tebaktebakan || {}
let id = m.chat
if (id in conn.tebaktebakan) return conn.reply(m.chat, '🍪 *Masih ada soal yang belum dijawab di chat ini!*', conn.tebaktebakan[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/main/tebaktebakan.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍰 *Tebak Tebakan!*
🍡 *Soal: ${json.soal}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(0)} detik*
🍬 *Hint: Ketik ${usedPrefix}hkan untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.tebaktebakan[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.tebaktebakan[id]) {
conn.reply(m.chat, `⏰ *Waktu habis! Jawabannya adalah ${json.jawaban}*`, conn.tebaktebakan[id][0])
delete conn.tebaktebakan[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['tebaktebakan']
handler.tags = ['game']
handler.command = /^tebaktebakan$/i
handler.register = true
handler.onlyprem = true
handler.game = true

export default handler