
let timeout = 120000
let poin = 1000

let handler = async (m, { conn, command, usedPrefix }) => {
conn.tebakgambar = conn.tebakgambar || {}
let id = m.chat
let ephemeral = conn.chats[m.chat]?.metadata?.ephemeralDuration || conn.chats[m.chat]?.ephemeralDuration || false
let setting = global.db.data.settings[conn.user.jid]
if (id in conn.tebakgambar)
return conn.reply(m.chat, '🍩 *Masih ada soal yang belum dijawab di chat ini!*', conn.tebakgambar[id][0])
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/refs/heads/main/tebakgambar.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍰 *Tebak Gambar!*
🍡 *Petunjuk: ${json.deskripsi}*
⏱️ *Waktu: ${(timeout / 1000).toFixed(2)} detik*
🍬 *Hint: Ketik ${usedPrefix}hgamb untuk bantuan*
🍫 *Bonus: ${poin} XP*
`.trim()
conn.tebakgambar[id] = [
await conn.sendMessage(m.chat, {
image: { url: json.img },
fileName: 'tebakgambar.jpg',
mimetype: 'image/jpeg',
caption: setting.smlcap ? conn.smlcap(caption) : caption
}, {
quoted: m,
ephemeralExpiration: ephemeral
}),
json,
poin,
4,
setTimeout(() => {
if (conn.tebakgambar[id]) {
conn.reply(m.chat, `⏰ *Waktu habis! Jawabannya adalah ${json.jawaban}*`, conn.tebakgambar[id][0])
delete conn.tebakgambar[id]
}
}, timeout)
]
} catch (err) {
console.error(err)
m.reply('⚠️ *Gagal mengambil soal dari GitHub.*')
}
}

handler.help = ['tebakgambar']
handler.tags = ['game']
handler.command = /^tebakgambar$/i
handler.register = true
handler.onlyprem = true
handler.game = true

export default handler