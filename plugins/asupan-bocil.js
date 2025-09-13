
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/bocil', {}, 'apikey')
await conn.sendFile(m.chat, url, 'bocil.mp4', '🍼 *Asupan Bocil nih Kak~* 🎬', m)
} catch (e) {
throw '❌ *Gagal mengambil video, coba lagi nanti ya sayang~*'
}
}

handler.help = ['bocil']
handler.tags = ['random']
handler.command = /^bocil$/i
handler.limit = true
handler.register = true

export default handler