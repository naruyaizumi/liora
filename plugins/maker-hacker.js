
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`❌ *Masukkan teks dengan benar!*\n\n📌 *Contoh:*\n${usedPrefix + command} Izumi`)
await global.loading(m, conn)
let url = global.API("lol", "/api/ephoto1/anonymhacker", { text }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `👨‍💻 *Anonymous Hacker Logo* 🕶️\n\n🕵️‍♂️ *Codename: ${text}*\n\n💀 *Gabung dalam dunia peretasan dengan gaya!*`
await conn.sendFile(m.chat, url, "anonymous_hacker.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat logo Anonymous Hacker! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["hacker"]
handler.tags = ["maker"]
handler.command = /^(hacker)$/i
handler.premium = true

export default handler