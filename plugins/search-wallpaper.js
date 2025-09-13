let handler = async (m, { conn, text }) => {
if (!text) return m.reply("🔍 *Masukkan kata kunci untuk mencari wallpaper, ya sayang!* 🍜")
await global.loading(m, conn)
try {
let res = await fetch(`https://api.hiuraa.my.id/search/wallpaper?q=${text}`)
let json = await res.json()
if (!json.result || !Array.isArray(json.result) || json.result.length === 0)
return m.reply("🥟 *Wallpaper tidak ditemukan!*")

let cards = json.result.slice(0, 10).map((item, i, arr) => ({
image: { url: item.image?.[0] || '' },
title: `🖼️ *Wallpaper ${i + 1} dari ${arr.length}*`,
body: `🍩 *Kata kunci: "${text}"*`,
footer: "",
buttons: [{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "🍙 Lihat Sumber",
url: item.source,
merchant_url: item.source
})
}]
}))
await conn.sendMessage(m.chat, {
text: `🍡 Menampilkan hasil pencarian: *"${text}"*`,
title: "🍰 Hasil Wallpaper",
subtitle: "📷 Pencarian Gambar",
footer: "",
cards
}, { quoted: m })
} catch (err) {
console.error(err)
m.reply("🥀 *Ups, terjadi kesalahan saat mengambil data. Coba lagi nanti, ya sayang!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["wallpaper"]
handler.tags = ["search"]
handler.command = /^(wallpaper|wp)$/i
handler.limit = true
handler.register = true

export default handler