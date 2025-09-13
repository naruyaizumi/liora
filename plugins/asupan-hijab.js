
let handler = async (m, { conn }) => {
try {
let url = global.API('btz', '/api/asupan/hijaber', {}, 'apikey')
await conn.sendFile(m.chat, url, 'hijaber.jpg', '🧕 *Asupan Hijaber Nih Kak~* ✨', m)
} catch (e) {
throw '❌ *Gagal mengambil gambar, coba lagi nanti ya sayang~*'
}
}

handler.help = ['hijab']
handler.tags = ['random']
handler.command = /^(hijab)$/i
handler.limit = true
handler.register = true

export default handler