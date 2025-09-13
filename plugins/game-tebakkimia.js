
let timeout = 120000
let poin = 4999

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebakkimia = conn.tebakkimia || {}
let id = m.chat
if (id in conn.tebakkimia)
return conn.reply(m.chat, '*Masih ada soal belum terjawab di chat ini*', conn.tebakkimia[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebakkimia.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🧪 *Tebak Kimia!*
*Silahkan Tebak Kepanjangan Dari Unsur "${json.lambang}"*

⏱️ *Timeout ${(timeout / 1000).toFixed(2)} detik*
💡 *Hint: Ketik ${usedPrefix}hmia untuk bantuan*
🎁 *Bonus: ${poin} XP*
`.trim()
conn.tebakkimia[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.tebakkimia[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\n🔬 *Jawabannya adalah ${json.unsur}*`, conn.tebakkimia[id][0])
delete conn.tebakkimia[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['tebakkimia']
handler.tags = ['game']
handler.command = /^tebakkimia$/i
handler.onlyprem = true
handler.game = true

export default handler