
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
let [text1, text2] = text.split("|")
if (!(text1 && text2)) return m.reply(`❌ *Masukkan teks dengan benar!*\n\n📌 *Contoh:*\n${usedPrefix + command} Beta|Botz`)
await global.loading(m, conn)
let url = global.API("btz", "/api/textpro/pornhub", { text: text1, text2: text2 }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `🔞 *Pornhub Logo Maker* 🔞\n\n🎨 *Teks 1: ${text1}*\n🔥 *Teks 2: ${text2}*\n\n🚀 *Logo berhasil dibuat! Simpan dan gunakan sesuai keinginan!*`
await conn.sendFile(m.chat, url, "pornhub.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat logo! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["pornhub"]
handler.tags = ["maker"]
handler.command = /^(pornhub)$/i
handler.premium = true

export default handler