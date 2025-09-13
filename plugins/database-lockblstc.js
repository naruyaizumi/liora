
let handler = async (m, { conn, usedPrefix, command }) => {
if (!m.quoted) return m.reply(`🍩 *Balas stiker yang mau dikunci/dibuka dengan perintah: ${usedPrefix + command}*`)
if (!m.quoted.fileSha256) return m.reply('🍪 *SHA256 Hash tidak ditemukan, pastikan kamu reply stikernya ya~*')
let hash = m.quoted.fileSha256.toString('base64')
global.db.data.bot = global.db.data.bot || {}
global.db.data.bot.stickerBlacklist = global.db.data.bot.stickerBlacklist || {}
if (!(hash in global.db.data.bot.stickerBlacklist)) return m.reply('🍰 *Stiker ini belum masuk daftar blacklist, nggak bisa dikunci~*')
global.db.data.bot.stickerBlacklist[hash].locked = !/^un/i.test(command)
let status = global.db.data.bot.stickerBlacklist[hash].locked ? 'terkunci' : 'terbuka'
m.reply(`🧁 *Stiker berhasil di-${status}, manisnya jadi aman dikendalikan~*`)
}

handler.help = ['lockblstc', 'unlockblstc']
handler.tags = ['database']
handler.command = /^(lockblstc|unlockblstc)$/i
handler.owner = true

export default handler