
let handler = async (m, { conn }) => {
try {
let url = 'https://api.hiuraa.my.id/random/hentai'
await conn.sendFile(m.chat, url, 'hentai.jpg', '🌸 *Nih gambarnya, mesum ya Kak~* 🩵', m)
} catch (e) {
throw '❌ *Gagal ambil gambar, coba lagi nanti ya sayang~*'
}
}

handler.help = ['hentai']
handler.tags = ['nsfw']
handler.command = /^(hentai)$/i
handler.nsfw = true
handler.premium = true
handler.register = true
handler.age = 18

export default handler