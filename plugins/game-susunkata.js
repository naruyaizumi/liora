
let timeout = 180000
let money = 5000
let limit = 2

let handler = async (m, { conn, usedPrefix }) => {
conn.susunkata = conn.susunkata || {}
let id = m.chat
if (id in conn.susunkata)
return conn.reply(m.chat, '🍪 *Masih ada soal yang belum dijawab di sini, ya!*', conn.susunkata[id][0])

try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/susunkata.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]

let caption = `
🍰 *Susun Kata!*
🍡 *Soal: ${json.soal}*
📮 *Tipe: ${json.tipe}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}suska untuk bantuan*
💸 *Bonus: Rp ${money}*
🎟️ *Limit: ${limit}*
`.trim()

conn.susunkata[id] = [
await conn.reply(m.chat, caption, m),
json,
money,
4,
setTimeout(() => {
if (conn.susunkata[id]) {
conn.reply(m.chat, `⏰ *Waktu habis! Jawabannya adalah ${json.jawaban}*`, conn.susunkata[id][0])
delete conn.susunkata[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['susunkata']
handler.tags = ['game']
handler.command = /^(susunkata|sskata)$/i
handler.game = true
handler.onlyprem = true
handler.register = true

export default handler