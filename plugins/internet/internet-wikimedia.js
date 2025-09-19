let handler = async (m, { conn, text }) => {
if (!text) return m.reply("🍜 *Masukkan kata kunci untuk mencari gambar di Wikimedia!*")
try {
await global.loading(m, conn)
const apiUrl = global.API("btz", "/api/search/wikimedia", { text1: text }, "apikey")
const response = await fetch(apiUrl)
if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`)
const json = await response.json()
if (!json.result || json.result.length === 0) return m.reply("🍣 *Tidak ada hasil untuk kata kunci tersebut!*")
const images = json.result.slice(0, 10)
let cards = []
for (let i = 0; i < images.length; i++) {
let item = images[i]
cards.push({
image: { url: item.image },
title: `🍱 *Wikimedia Result (${i + 1}/${images.length})*`,
body: `🍙 ${item.title}`,
footer: "",
buttons: [
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "🍤 Lihat Sumber",
url: item.source,
merchant_url: "https://commons.wikimedia.org"
})
}
]
})
}
await conn.sendMessage(m.chat, {
text: `🍛 *Hasil Pencarian Wikimedia: ${text}*`,
title: "🍩 *Wikimedia Image Search*",
subtitle: "",
footer: "🍬 Klik tombol untuk melihat gambar",
cards
}, { quoted: m })
} catch (error) {
console.error(error)
m.reply("🍡 *Terjadi kesalahan saat mengambil data dari Wikimedia. Coba lagi nanti!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["wikimedia"]
handler.tags = ["internet"]
handler.command = /^(wikimedia)$/i

export default handler