let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`📌 *Masukkan kata kunci pencarian Halodoc!*\n\nContoh:\n${usedPrefix + command} demam`)
try {
await global.loading(m, conn)
let detail = `
🩺 *Pencarian Halodoc: "${text}"*
━━━━━━━━━━━━━━━━━━━
📚 *Artikel — Baca informasi kesehatan terpercaya*
💊 *Obat — Cari produk yang tersedia di Halodoc*
━━━━━━━━━━━━━━━━━━━
🔎 *Silakan pilih salah satu opsi di bawah ini:*`
await conn.textOptions(
m.chat,
detail,
false,
[
[`${usedPrefix}haloartikel ${text}`, "Artikel Halodoc"],
[`${usedPrefix}haloobat ${text}`, "Obat Halodoc"]
],
m
)
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi kesalahan saat memproses pencarian!*\n\n${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['halodoc']
handler.tags = ['internet']
handler.command = /^halodoc$/i
handler.register = true
handler.limit = true

export default handler