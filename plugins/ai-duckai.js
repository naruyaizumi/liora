let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`📌 *Masukkan teks untuk berbicara dengan DuckAI!*\n\n📍 *Contoh: ${usedPrefix + command} Siapa kamu?*`)
await global.loading(m, conn)
let apiUrl = `https://api.siputzx.my.id/api/ai/duckai?query=${text}`
let response = await fetch(apiUrl)
if (!response.ok) return m.reply("⚠️ *Gagal mengambil respons dari DuckAI! Coba lagi nanti.*")
let json = await response.json()
if (!json.status || !json.response) return m.reply("🦆 *DuckAI tidak dapat merespons saat ini!*")
await conn.sendMessage(m.chat, {
text: `🦆 *DuckAI:*\n\n${json.response}`
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["duckai"]
handler.tags = ["ai"]
handler.command = /^(duckai)$/i
handler.limit = true
handler.register = true

export default handler