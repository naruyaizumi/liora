
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!m.quoted) return m.reply(`🍩 *Balas stiker yang ingin di-${/^un/i.test(command) ? 'unlock' : 'lock'} ya~*`)
if (!m.quoted.fileSha256) return m.reply('🍪 *Tidak ditemukan hash dari stiker tersebut!*')
let hash = m.quoted.fileSha256.toString('hex')
let sticker = global.db.data.users[m.sender].sticker || {}
if (!(hash in sticker)) return m.reply('🧁 *Hash tidak ditemukan dalam database stiker kamu!*')
sticker[hash].locked = !/^un/i.test(command)
m.reply(`🎀 *Berhasil di-${sticker[hash].locked ? 'lock' : 'unlock'}!*\n📌 *Perintah stiker sekarang ${sticker[hash].locked ? 'tidak bisa diubah' : 'bisa diubah kembali'}.*`)
}

handler.help = ['lockcmd', 'unlockcmd']
handler.tags = ['database']
handler.command = /^(lockcmd|unlockcmd)$/i
handler.premium = true
handler.register = true

export default handler