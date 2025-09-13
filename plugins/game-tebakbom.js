
let handler = async (m, { conn, usedPrefix, command }) => {

conn.tebakbom = conn.tebakbom ? conn.tebakbom : {}
let id = m.chat
let timeout = 180000
if (id in conn.tebakbom) return conn.reply(m.chat, '🍡 *Masih ada sesi yang belum selesai, sayang!*', conn.tebakbom[id][0])
const bom = ['💣', '🍬', '🍬', '🍬', '🍬', '🍬', '🍬', '🍬', '🍬'].sort(() => Math.random() - 0.5)
const number = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣']
const array = []
bom.map((v, i) => array.push({
emot: v,
number: number[i],
position: i + 1,
state: false
}))
let teks = `🍭 *Tebak Bom!*\n━━━━━━━━━━━━━━\n\n`
teks += `🍡 *Pilih angka 1 - 9 untuk membuka salah satu kotak:*\n\n`
teks += array.slice(0, 3).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += array.slice(3, 6).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += array.slice(6).map(v => v.state ? v.emot : v.number).join('') + '\n\n'
teks += `⏱️ *Timeout: ${(timeout / 1000 / 60)} menit*\n`
teks += `🎁 *Hindari bom dan temukan permen~*`
conn.tebakbom[id] = [
await conn.reply(m.chat, teks, m),
array,
setTimeout(() => {
let v = array.find(v => v.emot == '💣')
if (conn.tebakbom[id]) conn.reply(m.chat, `⏰ *Waktu habis!*\n🍬 *Bom berada di kotak: ${v.number}*`, conn.tebakbom[id][0])
delete conn.tebakbom[id]
}, timeout)
]
}

handler.help = ['tebakbom']
handler.tags = ['game']
handler.command = /^(tebakbom|bomb)$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler