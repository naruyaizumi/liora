
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/anony', {}, 'apikey')
await conn.sendFile(m.chat, url, 'anony.mp4', '🌀 *Asupan Anony-nya nih Kak~* 🎥', m)
} catch (e) {
throw '❌ *Gagal mengambil video, coba lagi nanti ya sayang~*'
}
}

handler.help = ['anony']
handler.tags = ['random']
handler.command = /^(anony)$/i
handler.limit = true
handler.register = true

export default handler