
let handler = async (m, { conn }) => {
try {
let url = 'https://api.hiuraa.my.id/random/loli'
await conn.sendFile(m.chat, url, 'loli.jpg', '🧸 *Loli Imutnya nih Kak~* 💗', m)
} catch (e) {
throw '❌ *Gagal mengambil gambar, coba lagi nanti ya sayang~*'
}
}

handler.help = ['loli']
handler.tags = ['random']
handler.command = /^(loli)$/i
handler.limit = true
handler.register = true

export default handler