
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, usedPrefix }) => {
conn.asahotak = conn.asahotak ? conn.asahotak : {}
let id = m.chat
if (id in conn.asahotak)
return conn.reply(m.chat, '🍮 *Masih ada pertanyaan yang belum dijawab di chat ini!*', conn.asahotak[id][0])

try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/main/asahotak.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]

let caption = `
🍩 *Asah Otak!*
💭 *Soal: ${json.soal}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}hotak untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()

conn.asahotak[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.asahotak[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\n🧠 *Jawabannya: ${json.jawaban}*`, conn.asahotak[id][0])
delete conn.asahotak[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('❌ Gagal mengambil soal asah otak dari server.')
}
}

handler.help = ['asahotak']
handler.tags = ['game']
handler.command = /^(asahotak)$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler