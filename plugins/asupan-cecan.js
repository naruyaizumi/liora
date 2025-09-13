
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/cecan', {}, 'apikey')
await conn.sendFile(m.chat, url, 'cecan.jpg', '💗 *Asupan Cecan Nih Kak~* 🌸', m)
} catch (e) {
throw '❌ *Gagal mengambil gambar, coba lagi nanti ya sayang~*'
}
}

handler.help = ['cecan']
handler.tags = ['random']
handler.command = /^(cecan)$/i
handler.limit = true
handler.register = true

export default handler