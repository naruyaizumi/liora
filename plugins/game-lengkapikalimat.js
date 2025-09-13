
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.lengkapikalimat = conn.lengkapikalimat || {}
let id = m.chat
if (id in conn.lengkapikalimat)
return conn.reply(m.chat, '🍩 *Masih ada soal yang belum dijawab di chat ini!*', conn.lengkapikalimat[id][0])

try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/lengkapikalimat.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]

let caption = `
🍰 *Lengkapi Kalimat Berikut!*
🍡 *Soal: ${json.soal}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}hlen untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()

conn.lengkapikalimat[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.lengkapikalimat[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\nJawabannya adalah *${json.jawaban}*`, conn.lengkapikalimat[id][0])
delete conn.lengkapikalimat[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ Gagal mengambil soal dari GitHub.')
}
}

handler.help = ['lengkapikalimat']
handler.tags = ['game']
handler.command = /^(lengkapikalimat)$/i
handler.register = true
handler.onlyprem = true
handler.game = true

export default handler