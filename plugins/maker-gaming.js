
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`❌ *Masukkan nama tim atau pemain!*\n\n📌 *Contoh:*\n${usedPrefix + command} Izumi`)
await global.loading(m, conn)
let url = global.API("lol", "/api/ephoto1/logogaming", { text }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `🎮 *Gaming Logo Maker* ⚡\n\n🛡 *Nama Tim: ${text}*\n🔥 *Siap mendominasi dunia gaming!*\n\n🚀 *Level up and conquer!*`
await conn.sendFile(m.chat, url, "gaming_logo.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat logo gaming! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["gaming"]
handler.tags = ["maker"]
handler.command = /^(gaming)$/i
handler.premium = true

export default handler