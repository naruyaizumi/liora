
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/natajadeh', {}, 'apikey')
await conn.sendFile(m.chat, url, 'nata.mp4', '💃 *Asupan Nata Jadeh nih Kak~* 🎬', m)
} catch (e) {
throw '❌ *Gagal mengambil video, coba lagi nanti ya sayang~*'
}
}

handler.help = ['natajadeh']
handler.tags = ['random']
handler.command = /^(natajadeh)$/i
handler.limit = true
handler.register = true

export default handler