let handler = async (m, { conn, text }) => {
if (!text) return m.reply("🔍 *Masukkan kata kunci untuk mencari gambar di Pixiv!* 🍘")
await global.loading(m, conn)
try {
const res = await fetch(global.API("lol", "/api/pixiv", { query: text }, "apikey"))
const json = await res.json()
if (!json.result || !json.result.length) return m.reply("🍡 *Tidak ditemukan hasil di Pixiv untuk kata kunci itu!*")
let cards = json.result.slice(0, 10).map((item, i, arr) => ({
image: { url: item.image },
title: `🎨 ${item.title}`,
body: `🖼️ *Gambar ${i + 1} dari ${arr.length}*`,
footer: "",
buttons: [{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "🌐 Lihat Gambar di Pixiv",
url: item.image
})
}]
}))
await conn.sendMessage(m.chat, {
text: `✨ *Hasil Pencarian di Pixiv: ${text}*`,
title: "📌 *Pixiv Gallery*",
subtitle: "",
footer: "🌸 Koleksi Ilustrasi",
cards
}, { quoted: m })
} catch (err) {
console.error(err)
m.reply("❌ *Ups, gagal mengambil data dari Pixiv. Coba beberapa saat lagi ya, sayang!* 🍥")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["pixiv"]
handler.tags = ["search"]
handler.command = /^(pixiv)$/i
handler.premium = true
handler.register = true

export default handler