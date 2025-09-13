
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebakkata = conn.tebakkata || {}
let id = m.chat
if (id in conn.tebakkata)
return conn.reply(m.chat, '🍬 *Masih ada soal yang belum dijawab di chat ini, sayang!*', conn.tebakkata[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebakkata.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍡 *Tebak Kata!*
🍰 *Soal: ${json.soal}*
⏱️ *Timeout: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Bantuan: Ketik ${usedPrefix}teka*
🎁 *Bonus: ${poin} XP*
`.trim()
conn.tebakkata[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.tebakkata[id]) {
conn.reply(m.chat, `🍭 *Waktu habis!* Jawabannya adalah *${json.jawaban}*`, conn.tebakkata[id][0])
delete conn.tebakkata[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['tebakkata']
handler.tags = ['game']
handler.command = /^tebakkata$/i
handler.register = true
handler.onlyprem = true
handler.game = true

export default handler