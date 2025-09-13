
let handler = async (m, { conn, text, args }) => {
let url = text || args[0]
if (!url || !/^https?:\/\/(s\.)?snackvideo\.com\//i.test(url)) {
return m.reply("🙅‍♀️ *URL tidak valid! Kirimkan link SnackVideo yang benar, ya.*")
}
try {
await global.loading(m, conn)
let response = await fetch(global.API("btz", "/api/download/snackvideo", { url }, "apikey"))
if (!response.ok) throw new Error(`*Gagal mendapatkan data dari API. Status:* ${response.status}`)
let json = await response.json()
if (!json.status || !json.result || !json.result.media) return m.reply("❌ *Gagal mendapatkan video. Pastikan URL benar dan coba lagi.*")
let { title, thumbnail, media, author, authorImage, like, comment, share } = json.result
let caption = `
🌸 *SnackVideo Downloader* 🌸
━━━━━━━━━━━━━━━━━━━
🎥 *Judul: ${title}*
👤 *Author: ${author}*
👍 *Like: ${like}*
💬 *Komentar: ${comment}*
🔄 *Share: ${share}*
📥 *Video sedang dikirim...*
━━━━━━━━━━━━━━━━━━━
`.trim()
let msg = await conn.sendMessage(m.chat, {
text: caption,
contextInfo: {
externalAdReply: {
title: author,
body: title,
thumbnailUrl: authorImage,
mediaUrl: url,
mediaType: 1,
renderLargerThumbnail: true,
},
},
}, { quoted: m })
await conn.sendMessage(m.chat, {
video: { url: media },
mimetype: "video/mp4",
caption: `🎥 *Video berhasil diunduh!*`
}, { quoted: msg })
} catch (error) {
console.error(error)
return m.reply(`❌ *Terjadi kesalahan saat memproses permintaan.*\n⚠️ *Detail:* ${error.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["snackvideo"]
handler.tags = ["downloader"]
handler.command = /^(snack|snackvideo)$/i
handler.limit = true
handler.register = true

export default handler