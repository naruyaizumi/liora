
let handler = async (m, { conn }) => {
try {
let url = 'https://api.hiuraa.my.id/random/bluearchive'
await conn.sendFile(m.chat, url, 'bluearchive.jpg', '📘 *Blue Archive Waifunya nih Kak~* 🌸', m)
} catch (e) {
throw '❌ *Gagal mengambil gambar, coba lagi nanti ya sayang~*'
}
}

handler.help = ['bluearchive']
handler.tags = ['random']
handler.command = /^(bluearchive)$/i
handler.limit = true
handler.register = true

export default handler