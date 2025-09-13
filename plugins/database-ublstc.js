
let handler = async (m, { conn, usedPrefix, command }) => {
if (!m.quoted) return m.reply(`🍬 *Balas stiker yang mau dihapus dari blacklist dengan perintah: ${usedPrefix + command}*`)
if (!m.quoted.fileSha256) return m.reply('🍪 *Hash stikernya tidak ditemukan~*')
let hash = m.quoted.fileSha256.toString('base64')
global.db.data.bot = global.db.data.bot || {}
global.db.data.bot.stickerBlacklist = global.db.data.bot.stickerBlacklist || {}
if (!global.db.data.bot.stickerBlacklist[hash]) {
return m.reply('🍩 *Stiker ini belum diblacklist, jadi nggak bisa di-unblacklist~*')
}
delete global.db.data.bot.stickerBlacklist[hash]
m.reply('🧁 *Stiker berhasil dihapus dari blacklist, boleh dimakan lagi deh~*')
}

handler.help = ['ublstc']
handler.tags = ['database']
handler.command = /^(ublstc)$/i
handler.admin = true
handler.register = true

export default handler