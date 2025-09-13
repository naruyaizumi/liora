
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`❌ *Masukkan teks untuk tweet!*\n\n📌 *Contoh:*\n${usedPrefix + command} Naruya Izumi`)
await global.loading(m, conn)
let url = global.API("lol", "/api/tweettrump", { text }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `🇺🇸 *Donald Trump Tweet Generator* 🐦\n\n📢 *Pesan: ${text}*\n🤔 *Apakah ini benar-benar tweet asli?*`
await conn.sendFile(m.chat, url, "trump_tweet.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat tweet! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["tweettrump"]
handler.tags = ["maker"]
handler.command = /^(tweettrump)$/i
handler.premium = true

export default handler