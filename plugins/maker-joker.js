
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`❌ *Masukkan teks dengan benar!*\n\n📌 *Contoh:*\n${usedPrefix + command} Beta`)
await global.loading(m, conn)
let url = global.API("btz", "/api/textpro/joker-logo", { text }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `🃏 *Joker Logo Maker* 🎭\n\n🔥 *Teks: ${text}*\n\n😈 *Jadilah Joker di dunia digital!*`
await conn.sendFile(m.chat, url, "joker-logo.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat logo! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["joker"]
handler.tags = ["maker"]
handler.command = /^(joker)$/i
handler.premium = true

export default handler