
let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🍡 *Contoh penggunaan: ${usedPrefix + command} Ini deskripsi baru~*`)
try {
await conn.groupUpdateDescription(m.chat, args.join(' '))
m.reply('🍓 *Deskripsi grup berhasil diubah yaa~*')
} catch (e) {
console.error(e)
m.reply('🍬 *Gagal mengubah deskripsi grup. Pastikan bot admin dan waktunya belum dibatasi oleh WhatsApp~*')
}
}

handler.help = ['setdesc']
handler.tags = ['group']
handler.command = /^(setdesc|setdesk|setdeskripsi)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler