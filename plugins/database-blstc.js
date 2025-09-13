
let handler = async (m, { conn, usedPrefix, command }) => {
if (!m.quoted) return m.reply(`🍩 *Balas stikernya dulu sayang pakai perintah: ${usedPrefix + command}*`)
if (!m.quoted.fileSha256) return m.reply('🍪 *Hash stiker tidak ditemukan~*')
let hash = m.quoted.fileSha256.toString('base64')
global.db.data.bot = global.db.data.bot || {}
global.db.data.bot.stickerBlacklist = global.db.data.bot.stickerBlacklist || {}
if (global.db.data.bot.stickerBlacklist[hash]) {
return m.reply('🍰 *Stiker ini udah masuk daftar hitam sebelumnya, sayang~*')
}
global.db.data.bot.stickerBlacklist[hash] = {
reason: '🍬 Diblacklist manual',
addedBy: m.sender,
date: +new Date()
}
m.reply('🧁 *Stiker berhasil masuk daftar blacklist, cemilan beracun udah diamankan!*')
}

handler.help = ['blstc']
handler.tags = ['database']
handler.command = /^(blstc)$/i
handler.admin = true
handler.register = true

export default handler