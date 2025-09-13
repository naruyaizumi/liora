
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebaklogo = conn.tebaklogo || {}
let id = m.chat
if (id in conn.tebaklogo)
return conn.reply(m.chat, '🍪 *Masih ada soal yang belum dijawab di chat ini, ya!*', conn.tebaklogo[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebaklogo.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍰 *Tebak Logo!*
🧁 *Deskripsi: ${json.deskripsi}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}hlogo untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.tebaklogo[id] = [
await conn.sendFile(m.chat, json.img, 'tebaklogo.jpg', caption, m),
json,
poin,
4,
setTimeout(() => {
if (conn.tebaklogo[id]) {
conn.reply(m.chat, `⏰ *Waktu habis! Jawabannya adalah ${json.jawaban}*`, conn.tebaklogo[id][0])
delete conn.tebaklogo[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['tebaklogo']
handler.tags = ['game']
handler.command = /^tebaklogo$/i
handler.register = true
handler.onlyprem = true
handler.game = true

export default handler