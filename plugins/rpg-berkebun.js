
const timeout = 1800000

let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let lastTime = user.lastberkebon || 0
let timeDiff = new Date() - lastTime
let timeLeft = timeout - timeDiff
if (timeDiff < timeout) {
return conn.reply(m.chat, `🍓 *Tunggu ${clockString(timeLeft)} untuk berkebun lagi~*`, m)
}
let minimal = {
bibitpisang: 15,
bibitanggur: 20,
bibitmangga: 18,
bibitjeruk: 22,
bibitapel: 25
}
let kekurangan = Object.entries(minimal).filter(([k, v]) => user[k] < v)
if (kekurangan.length > 0) {
let list = kekurangan.map(([k, v]) => {
let nama = global.rpg.emoticon(k)
return `${nama} ${k.replace("bibit", "")}: ${v - user[k]}`
}).join("\n")
return conn.reply(m.chat, `🍥 *Bibit kamu belum cukup~*\n\n${list}`, m)
}
let hasilPanen = {
pisang: Math.floor(Math.random() * 20) + 5,
anggur: Math.floor(Math.random() * 15) + 5,
mangga: Math.floor(Math.random() * 10) + 4,
jeruk: Math.floor(Math.random() * 12) + 5,
apel: Math.floor(Math.random() * 8) + 2
}

let hasilPanenMessage = `
🍧 *Panen Buah Kebun Kamu* 🍒

*${global.rpg.emoticon("pisang")} Pisang: ${hasilPanen.pisang}*
*${global.rpg.emoticon("anggur")} Anggur: ${hasilPanen.anggur}*
*${global.rpg.emoticon("mangga")} Mangga: ${hasilPanen.mangga}*
*${global.rpg.emoticon("jeruk")} Jeruk: ${hasilPanen.jeruk}*
*${global.rpg.emoticon("apel")} Apel: ${hasilPanen.apel}*
`.trim()
Object.keys(hasilPanen).forEach(fruit => {
user[fruit] += hasilPanen[fruit]
user[`bibit${fruit}`] -= minimal[`bibit${fruit}`]
global.db.data.bots.stock[`bibit${fruit}`] += minimal[`bibit${fruit}`]
})
user.lastberkebon = new Date * 1
conn.reply(m.chat, '🍭 *Sedang menanam bibit buah...*', m)
setTimeout(() => {
conn.reply(m.chat, hasilPanenMessage, m)
}, 20000)
}

handler.help = ['berkebun']
handler.tags = ['rpg']
handler.command = /^(berkebun|tanam)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.level = 30
handler.energy = 60

export default handler

function clockString(ms) {
let h = Math.floor(ms / 3600000)
let m = Math.floor(ms / 60000) % 60
let s = Math.floor(ms / 1000) % 60
return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}