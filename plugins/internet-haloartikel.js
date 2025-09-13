
let handler = async (m, { conn, usedPrefix, command, text }) => {
if (!text) return m.reply(`📌 *Masukkan kata kunci atau judul artikel!*\n\nContoh:\n${usedPrefix + command} demam`)
if (/^https?:\/\/(www\.)?halodoc\.com\//i.test(text)) return m.reply(`❌ *Jangan pakai link langsung!* Gunakan kata kunci saja.`)

try {
await global.loading(m, conn)
if (global.artikelResults && Array.isArray(global.artikelResults)) {
let match = global.artikelResults.find(v => v.title.trim().toLowerCase() === text.trim().toLowerCase())
if (match) {
return conn.sendMessage(m.chat, {
image: { url: match.imageUrl },
caption: `*${match.title}*\n\n${match.description}\n\n🌐 ${match.link}`
}, { quoted: m })
}
}
let res = await fetch(`https://api.hiuraa.my.id/search/halodoc-article?q=${encodeURIComponent(text)}`)
if (!res.ok) throw await res.text()
let json = await res.json()
if (!json.status || !json.result || json.result.length === 0) return m.reply(`❌ *Tidak ditemukan artikel untuk:* ${text}`)
global.artikelResults = json.result
let list = json.result.map((v, i) => [`${usedPrefix}haloartikel ${v.title}`, (i + 1).toString(), v.title])
await conn.textList(m.chat, `📚 *Ditemukan ${json.result.length} artikel!*\n📌 Pilih salah satu dari daftar:`, false, list, m)
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi kesalahan saat memproses artikel!*\n\n${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['haloartikel']
handler.tags = ['internet']
handler.command = /^haloartikel$/i
handler.register = true
handler.limit = true

export default handler