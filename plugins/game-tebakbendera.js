
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, usedPrefix }) => {
conn.tebakbendera = conn.tebakbendera || {}
let id = m.chat
if (id in conn.tebakbendera)
return conn.reply(m.chat, '🍩 *Masih ada soal yang belum dijawab di chat ini!*', conn.tebakbendera[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebakbendera.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍰 *Tebak Bendera!*
🚩 *Coba tebak bendera di atas yaa!*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}teben untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.tebakbendera[id] = [
await conn.sendFile(m.chat, json.img, 'tebakbendera.jpg', caption, m),
json,
poin,
4,
setTimeout(() => {
if (conn.tebakbendera[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\n🏳️ *Jawabannya: ${json.name}*`, conn.tebakbendera[id][0])
delete conn.tebakbendera[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['tebakbendera']
handler.tags = ['game']
handler.command = /^tebakbendera$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler