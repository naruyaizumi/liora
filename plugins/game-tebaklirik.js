
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebaklirik = conn.tebaklirik || {}
let id = m.chat
if (id in conn.tebaklirik)
return conn.reply(m.chat, '🍩 *Masih ada soal yang belum terjawab di sini, ya~*', conn.tebaklirik[id][0])

try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebaklirik.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]

let caption = `
🍰 *Tebak Lirik!*
🍡 *Lirik: ${json.soal}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}terik untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()

conn.tebaklirik[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.tebaklirik[id]) {
conn.reply(m.chat, `⏰ *Waktu habis! Jawabannya adalah ${json.jawaban}*`, conn.tebaklirik[id][0])
delete conn.tebaklirik[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ Gagal mengambil soal dari GitHub.')
}
}

handler.help = ['tebaklirik']
handler.tags = ['game']
handler.command = /^tebaklirik$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler