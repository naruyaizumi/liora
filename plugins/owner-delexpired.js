
let handler = async (m, { conn, args, usedPrefix, command }) => {
let who
if (m.isGroup) who = args[0] ? args[0] : m.chat
else who = args[0]
global.db.data.chats[who].expired = false
conn.reply(m.chat, '🍫 *Berhasil menghapus masa sewa grup ini!*\n*Sekarang grup ini bebas dari batas waktu.*', m)
}

handler.help = ['delexpired']
handler.tags = ['owner']
handler.command = /^(delexpired|delsewa)$/i
handler.owner = true

export default handler