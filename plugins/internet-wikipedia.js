let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text || typeof text !== "string") return m.reply(`⚠️ *Masukkan kata kunci yang valid untuk mencari Wikipedia!*\n\n*Contoh: ${usedPrefix + command} OpenAI*`)
await global.loading(m, conn)
let apiUrl = global.API("btz", "/api/search/wikipedia", { text }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan dalam pencarian Wikipedia. Coba lagi nanti!*')
let json = await response.json()
if (!json.result || !json.result.title || !json.result.isi) return m.reply('⚠️ *Tidak ditemukan hasil yang sesuai di Wikipedia.*')
await conn.sendMessage(m.chat, {
text: `📖 *Wikipedia: ${json.result.title}*\n\n${json.result.isi}`
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['wiki']
handler.tags = ['internet']
handler.command = /^(wiki|wikipedia)$/i
handler.premium = true

export default handler