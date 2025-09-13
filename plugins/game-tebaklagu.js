
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebaklagu = conn.tebaklagu || {}
let id = m.chat
if (id in conn.tebaklagu)
return conn.reply(m.chat, '🍩 *Masih ada soal yang belum terjawab di sini, ya~*', conn.tebaklagu[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebaklagu.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍰 *Tebak Lagu!*
🍡 *Artist: ${json.artis}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}hlagu untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.tebaklagu[id] = [
await m.reply(caption),
json,
poin,
4,
setTimeout(() => {
if (conn.tebaklagu[id]) {
conn.reply(m.chat, `⏰ *Waktu habis! Jawabannya adalah ${json.judul}*`, conn.tebaklagu[id][0])
delete conn.tebaklagu[id]
}
}, timeout)
]
let audio = await fetch(json.lagu)
let buffer = Buffer.from(await audio.arrayBuffer())
await conn.sendMessage(m.chat, {
audio: buffer,
mimetype: 'audio/mpeg',
ptt: true
}, { quoted: conn.tebaklagu[id][0] })

} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub atau memuat audio.*')
}
}

handler.help = ['tebaklagu']
handler.tags = ['game']
handler.command = /^tebaklagu$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler