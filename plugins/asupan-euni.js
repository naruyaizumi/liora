
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/euni', {}, 'apikey')
await conn.sendFile(m.chat, url, 'euni.mp4', '🎬 *Asupan Euni nih Kak~* 🌸', m)
} catch (e) {
throw '❌ *Gagal mengambil video, coba lagi nanti ya sayang~*'
}
}

handler.help = ['euni']
handler.tags = ['random']
handler.command = /^(euni)$/i
handler.limit = true
handler.register = true

export default handler