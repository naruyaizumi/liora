let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`⚠️ *Masukkan teks pertanyaan untuk Lepton AI!*\n\n*Contoh: ${usedPrefix + command} Apa itu AI?*`)
await global.loading(m, conn)
let apiUrl = global.API("btz", "/api/search/lepton-ai", { text }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan dalam memproses permintaan. Coba lagi nanti!*')
let json = await response.json()
if (!json.result || !json.result.result) return m.reply('⚠️ *Gagal mendapatkan jawaban dari Lepton AI. Coba lagi nanti!*')
let msg = {
text: `🧠 *Lepton AI:*\n\n${json.result.result}`
}
await conn.sendMessage(m.chat, msg, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['lepton']
handler.tags = ['ai']
handler.command = /^(lepton|leptonai)$/i
handler.premium = true
handler.register = true

export default handler