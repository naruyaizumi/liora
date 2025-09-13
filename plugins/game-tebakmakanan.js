
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, usedPrefix }) => {
conn.tebakmakanan = conn.tebakmakanan || {}
let id = m.chat
if (id in conn.tebakmakanan)
return conn.reply(m.chat, '🍩 *Masih ada soal yang belum dijawab di chat ini!*', conn.tebakmakanan[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebakmakanan.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍰 *Tebak Makanan!*
🍡 *Deskripsi: ${json.deskripsi}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}teman untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.tebakmakanan[id] = [
await conn.sendFile(m.chat, json.img, 'tebakmakanan.jpg', caption, m),
json,
poin,
4,
setTimeout(() => {
if (conn.tebakmakanan[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\n🍮 *Jawabannya: ${json.jawaban}*`, conn.tebakmakanan[id][0])
delete conn.tebakmakanan[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['tebakmakanan']
handler.tags = ['game']
handler.command = /^tebakmakanan$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler