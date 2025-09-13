
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/gheayubi', {}, 'apikey')
await conn.sendFile(m.chat, url, 'ghea.mp4', '🎀 *Asupan Ghea Yubi nih Kak~* 💃', m)
} catch (e) {
throw '❌ *Gagal mengambil video, coba lagi nanti ya sayang~*'
}
}

handler.help = ['gheayubi']
handler.tags = ['random']
handler.command = /^(gheayubi)$/i
handler.limit = true
handler.register = true

export default handler