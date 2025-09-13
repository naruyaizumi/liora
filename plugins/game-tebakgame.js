
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebakgame = conn.tebakgame || {}
let id = m.chat
if (id in conn.tebakgame)
return conn.reply(m.chat, '🍩 *Masih ada soal yang belum dijawab di chat ini!*', conn.tebakgame[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebakgame.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍰 *Tebak Game!*
🍡 *Soal: Game apakah ini?*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}hgame untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.tebakgame[id] = [
await conn.sendFile(m.chat, json.img, 'tebakgame.jpg', caption, m),
json,
poin,
4,
setTimeout(() => {
if (conn.tebakgame[id]) {
conn.reply(m.chat, `⏰ *Waktu habis! Jawabannya adalah ${json.jawaban}*`, conn.tebakgame[id][0])
delete conn.tebakgame[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('❌ *Gagal mengambil soal dari GitHub!*')
}
}

handler.help = ['tebakgame']
handler.tags = ['game']
handler.command = /^tebakgame$/i
handler.register = true
handler.onlyprem = true
handler.game = true

export default handler