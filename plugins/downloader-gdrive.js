
let handler = async (m, { conn, text, args }) => {
let url = text || args[0]
if (!url || !/^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\//i.test(url)) {
return m.reply("🙅‍♀️ *URL tidak valid! Kirimkan link Google Drive yang benar, ya.*")
}
try {
await global.loading(m, conn)
let response = await fetch(global.API("btz", "/api/download/gdrive", { url }, "apikey"))
if (!response.ok) throw new Error(`*Gagal mendapatkan data dari API. Status:* ${response.status}`)
let json = await response.json()
if (!json.status || !json.result || !json.result.data) return m.reply("❌ *Gagal mendapatkan file. Pastikan URL benar dan coba lagi.*")
let { fileName, fileSize, mimetype, data } = json.result
let now = new Date()
let locale = "id-ID"
let dayName = now.toLocaleDateString(locale, { weekday: "long" })
let date = now.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })
let time = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
let caption = `
━━━━━━━━━━━━━━━━━━━
🌸 *Google Drive Downloader* 🌸
━━━━━━━━━━━━━━━━━━━
📁 *Nama File: ${fileName}*
📦 *Ukuran File: ${fileSize}*
📄 *Tipe File: ${mimetype}*
━━━━━━━━━━━━━━━━━━━
📅 *Tanggal: ${dayName}, ${date}*
🕒 *Jam: ${time}*
📥 *File sedang diproses untuk pengiriman. Mohon bersabar!* 😊
`.trim()
await conn.sendMessage(m.chat, {
document: { url: data },
fileName: fileName,
mimetype: mimetype,
caption: caption
}, { quoted: m })
} catch (error) {
console.error(error)
m.reply(`❌ *Terjadi kesalahan saat memproses permintaan.*\n\n⚠️ *Detail:* ${error.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["gdrive"]
handler.tags = ["downloader"]
handler.command = /^(gdrive|gdrivedl)$/i
handler.limit = true
handler.register = true

export default handler