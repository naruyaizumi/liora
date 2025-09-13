
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!m.quoted) return m.reply(`🍩 *Balas stiker dengan perintah: ${usedPrefix + command}* 🍓`)
if (!m.quoted.fileSha256) return m.reply('🍪 *Hash SHA256 tidak ditemukan!*\n*Coba reply ulang stikernya ya~*')
if (!text) return m.reply(`🧁 *Penggunaan: ${usedPrefix + command} ${usedPrefix + command}\n\n🎀 *Contoh: ${usedPrefix + command} .menu*`)
let sticker = global.db.data.users[m.sender].sticker
let hash = m.quoted.fileSha256.toString('base64')
if (sticker[hash] && sticker[hash].locked)
return m.reply('🍮 *Ups! Stiker ini terkunci dan tidak bisa diubah~*')
sticker[hash] = {
text,
mentionedJid: m.mentionedJid,
creator: m.sender,
at: +new Date,
locked: false,
}
m.reply('🍰 *Perintah stiker berhasil disimpan!* ✨')
}

handler.help = ['setcmd']
handler.tags = ['database']
handler.command = /^(setcmd)$/i
handler.limit = true
handler.register = true

export default handler