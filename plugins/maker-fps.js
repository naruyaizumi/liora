
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`❌ *Masukkan teks dengan benar!*\n\n📌 *Contoh:*\n${usedPrefix + command} Izumi`)
await global.loading(m, conn)
let url = global.API("lol", "/api/ephoto1/fpslogo", { text }, "apikey")
let res = await fetch(url)
if (!res.ok) throw new Error(`Gagal mengambil gambar, status: ${res.status}`)
let caption = `🎯 *FPS Logo Maker* 🔥\n\n🛡 *Nama Clan: ${text}*\n🎮 *Siap menaklukkan medan perang FPS!*\n\n🚀 *Let's go, shooter!*`
await conn.sendFile(m.chat, url, "fps_logo.jpg", caption, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal membuat logo FPS! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["fps"]
handler.tags = ["maker"]
handler.command = /^(fps)$/i
handler.premium = true

export default handler