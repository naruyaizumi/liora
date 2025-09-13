
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, usedPrefix }) => {
conn.siapakahaku = conn.siapakahaku || {}
let id = m.chat
if (id in conn.siapakahaku)
return conn.reply(m.chat, '🍮 *Masih ada soal belum terjawab di chat ini!*', conn.siapakahaku[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/siapakahaku.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍭 *Siapakah Aku?*
💡 *${json.soal}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}who untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.siapakahaku[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.siapakahaku[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\n🧠 *Jawabannya: ${json.jawaban}*`, conn.siapakahaku[id][0])
delete conn.siapakahaku[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('❌ Gagal mengambil soal dari GitHub.')
}
}

handler.help = ['siapakahaku']
handler.tags = ['game']
handler.command = /^siapa(kah)?aku$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler