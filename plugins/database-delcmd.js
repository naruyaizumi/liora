
let handler = async (m, { conn, usedPrefix, text, command }) => {
let hash = text
if (m.quoted && m.quoted.fileSha256) hash = m.quoted.fileSha256.toString('hex')
if (!hash) return m.reply(`🍩 *Reply stiker yang memiliki hash dulu ya~*\n*Coba reply stiker lalu gunakan ${usedPrefix + command}* 🍓`)
let sticker = global.db.data.users[m.sender].sticker
if (sticker[hash] && sticker[hash].locked) return m.reply('🍮 *Ups, stiker ini terkunci dan tidak bisa dihapus!*')
delete sticker[hash]
m.reply(`🧁 *Perintah stiker berhasil dihapus!* 🍬`)
}

handler.help = ['delcmd']
handler.tags = ['database']
handler.command = /^delcmd$/i
handler.limit = true
handler.register = true

export default handler