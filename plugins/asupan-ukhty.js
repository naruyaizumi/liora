
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/ukhty', {}, 'apikey')
await conn.sendFile(m.chat, url, 'ukhty.mp4', '🧕 *Asupan Ukhty-nya nih Kak~* 🎥', m)
} catch (e) {
throw '❌ *Gagal mengambil video, coba lagi nanti ya sayang~*'
}
}

handler.help = ['ukhty']
handler.tags = ['random']
handler.command = /^(ukhty)$/i
handler.limit = true
handler.register = true

export default handler