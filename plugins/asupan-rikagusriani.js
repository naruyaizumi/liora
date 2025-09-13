
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/rikagusriani', {}, 'apikey')
await conn.sendFile(m.chat, url, 'rika.mp4', '🎬 *Asupan Rika Gusriani nih Kak~* 💃', m)
} catch (e) {
throw '❌ *Gagal mengambil video, coba lagi nanti ya sayang~*'
}
}

handler.help = ['rikagusriani']
handler.tags = ['random']
handler.command = /^(rikagusriani)$/i
handler.limit = true
handler.register = true

export default handler