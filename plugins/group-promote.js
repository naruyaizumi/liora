
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text && !m.mentionedJid.length) return m.reply(`🍩 *Masukkan nomor atau tag pengguna yang ingin dijadikan admin, contoh: ${usedPrefix + command} @user atau 6281234567890*`)
let users = m.mentionedJid.length ? m.mentionedJid : text.split(/\s+/).map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').filter(v => v.length > 14)
if (!users.length) return m.reply('🍰 *Nomor tidak valid atau tidak ditemukan.*')
try {
await conn.groupParticipantsUpdate(m.chat, users, 'promote')
m.reply('🍓 *Berhasil dijadikan admin ya sayang~*')
} catch (e) {
m.reply('🍩 *Terjadi kesalahan, pastikan nomor valid dan bot adalah admin.*')
}
}

handler.help = ['promote']
handler.tags = ['group']
handler.command = /^(promote)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler