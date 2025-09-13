
let handler = async (m, { conn, text, usedPrefix, command, participants }) => {
if (!text && !m.mentionedJid.length) return m.reply(`🍰 *Masukkan nomor atau tag pengguna yang ingin diturunkan dari admin, contoh: ${usedPrefix + command} @user atau 6281234567890*`)
let users = m.mentionedJid.length ? m.mentionedJid : text.split(/\s+/).map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').filter(v => v.length > 14)
if (!users.length) return m.reply('🍩 *Nomor tidak valid atau tidak ditemukan.*')
try {
await conn.groupParticipantsUpdate(m.chat, users, 'demote')
m.reply('🧁 *Berhasil diturunkan dari admin ya sayang~*')
} catch (e) {
m.reply('🍬 *Terjadi kesalahan, pastikan nomor valid dan bot adalah admin.*')
}
}

handler.help = ['demote']
handler.tags = ['group']
handler.command = /^(demote)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler