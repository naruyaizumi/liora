
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`❌ *Masukkan teks dengan benar!*\n\n📌 *Contoh:*\n${usedPrefix + command} Izumi`)
await global.loading(m, conn)
let url = global.API("lol", "/api/ephoto1/freefire", { text }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `🔥 *Free Fire Text Maker* 🎯\n\n⚔️ *Nickname: ${text}*\n\n⚡ *Buat teks dengan gaya Free Fire yang keren!*`
await conn.sendFile(m.chat, url, "freefire.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat logo Free Fire! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["freefire"]
handler.tags = ["maker"]
handler.command = /^(freefire)$/i
handler.premium = true

export default handler