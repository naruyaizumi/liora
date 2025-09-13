
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
let [text1, text2] = text.split("|")
if (!(text1 && text2)) return m.reply(`❌ *Masukkan teks dengan benar!*\n\n📌 *Contoh:*\n${usedPrefix + command} Beta|Botzz`)
await global.loading(m, conn)
let url = global.API("btz", "/api/textpro/lion-logo", { text: text1, text2: text2 }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `🦁 *Lion Logo Maker* 🦁\n\n⚡ *Teks 1: ${text1}*\n🔥 *Teks 2: ${text2}*\n\n🚀 *Logo berhasil dibuat! Tunjukkan keberanianmu dengan logo ini!*`
await conn.sendFile(m.chat, url, "lion.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat logo! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["lion"]
handler.tags = ["maker"]
handler.command = /^(lion)$/i
handler.premium = true

export default handler