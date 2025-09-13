let handler = async (m, { conn, text }) => {
if (!text || typeof text !== "string") return m.reply('⚠️ *Masukkan teks pertanyaan untuk Blackbox AI!*')
try {
await global.loading(m, conn)
let apiUrl = global.API("btz", "/api/search/blackbox-chat", { text }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan dalam memproses permintaan. Coba lagi nanti!*')
let json = await response.json()
if (!json.message) return m.reply('⚠️ *Gagal mendapatkan jawaban dari Blackbox AI. Coba lagi nanti!*')
await conn.sendMessage(m.chat, {
text: `💻 *Blackbox AI:*\n\n${json.message}`
}, { quoted: m })
} catch (error) {
console.error(error)
m.reply('⚠️ *Terjadi kesalahan saat mengambil data dari Blackbox AI. Coba lagi nanti!*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['blackbox']
handler.tags = ['ai']
handler.command = /^(blackbox|blackboxai)$/i
handler.premium = true
handler.register = true

export default handler