
let handler = async (m, { conn, args, usedPrefix, command }) => {
let who
if (m.isGroup) who = args[1] ? args[1] : m.chat
else who = args[1]
if (global.db.data.chats[who].expired < 1) return m.reply('🍪 *Grup ini belum diatur masa sewa-nya!*')
let now = new Date() * 1
let sisa = msToDate(global.db.data.chats[who].expired - now)
conn.reply(m.chat, `🍰 *Sisa Masa Sewa Grup Ini:*\n\n${sisa}`, m)
}

handler.help = ['cekexpired']
handler.tags = ['group']
handler.command = /^((cek)?expired)$/i
handler.group = true
handler.admin = true

export default handler

function msToDate(ms) {
let days = Math.floor(ms / (24 * 60 * 60 * 1000))
let daysms = ms % (24 * 60 * 60 * 1000)
let hours = Math.floor(daysms / (60 * 60 * 1000))
let hoursms = ms % (60 * 60 * 1000)
let minutes = Math.floor(hoursms / (60 * 1000))
return `*${days} hari ${hours} jam ${minutes} menit* 🍬`
}