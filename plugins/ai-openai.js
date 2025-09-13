let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`⚠️ *Masukkan teks pertanyaan untuk AI!*\n\n*Contoh: ${usedPrefix + command} Apa itu AI?*`)
await global.loading(m, conn)
let apiUrl = global.API("btz", "/api/search/openai-chat", { text }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan dalam memproses permintaan. Coba lagi nanti!*')
let json = await response.json()
if (!json.message) return m.reply('⚠️ *Gagal mendapatkan jawaban dari AI. Coba lagi nanti!*')
await conn.sendMessage(m.chat, {
text: `🧠 *OpenAI:*\n\n${json.message}`
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply('❌ *Terjadi Kesalahan Teknis!*\n🍩 *Maaf ya, coba lagi sebentar lagi yaa~*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ai']
handler.tags = ['ai']
handler.command = /^(ai|openai|chatgpt)$/i
handler.limit = true
handler.register = true

export default handler