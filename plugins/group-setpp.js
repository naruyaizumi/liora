
import fs from 'fs'

let handler = async (m, { conn, usedPrefix, command }) => {
if (!m.quoted || !/image/.test(m.quoted.mimetype)) return m.reply(`*Kirim atau balas gambar dengan perintah:*\n${usedPrefix + command}`)

try {
let media = await m.quoted.download()
await conn.updateProfilePicture(m.chat, media)
m.reply('*Foto grup berhasil diperbarui!*')
} catch (e) {
m.reply('⚠️ *Gagal mengganti foto grup. Pastikan aku adalah admin dan gambar tidak melebihi batas ukuran.*')
}
}

handler.help = ['setppgc']
handler.tags = ['group']
handler.command = /^(setppgc)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler