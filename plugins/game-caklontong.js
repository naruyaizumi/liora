
let timeout = 120000
let poin = 4999

let handler = async (m, { conn, usedPrefix }) => {
conn.caklontong = conn.caklontong ? conn.caklontong : {}
let id = m.chat
if (id in conn.caklontong)
return conn.reply(m.chat, '❗ *Masih ada soal belum terjawab di chat ini!*', conn.caklontong[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/caklontong.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🧠 *Cak Lontong Quiz!*
❓ *Soal: ${json.soal}*

⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
💡 *Hint: Ketik ${usedPrefix}calo untuk bantuan*
🎁 *Bonus: ${poin} XP*
`.trim()
conn.caklontong[id] = [
await conn.reply(m.chat, caption, m),
json,
poin,
4,
setTimeout(async () => {
if (conn.caklontong[id]) {
await conn.reply(m.chat, `⏰ *Waktu habis!*\n✅ *Jawaban:* ${json.jawaban}\n📖 *Penjelasan:* ${json.deskripsi}`, conn.caklontong[id][0])
delete conn.caklontong[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ Gagal mengambil soal dari server GitHub.')
}
}

handler.help = ['caklontong']
handler.tags = ['game']
handler.command = /^(caklontong)$/i
handler.onlyprem = true
handler.game = true

export default handler