
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/douyin', {}, 'apikey')
await conn.sendFile(m.chat, url, 'douyin.mp4', '🎀 *Asupan dari Douyin nih Kak!* 🍓', m)
} catch (e) {
throw '❌ *Terjadi error saat mengambil video, coba lagi nanti ya!*'
}
}

handler.help = ['douyin']
handler.tags = ['random']
handler.command = /^(douyin)$/i
handler.limit = true
handler.register = true

export default handler