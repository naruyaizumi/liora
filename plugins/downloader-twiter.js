
let handler = async (m, { conn, text, args, usedPrefix, command }) => {
let url = text || args[0]
if (!url || !url.match(/(https:\/\/(www\.)?(x|twitter)\.com\/[a-zA-Z0-9_]+\/status\/\d+)/i)) {
return m.reply(`🌸 *Ups, linknya nggak sesuai nih, sayang. Coba kirim link Twitter yang benar, ya!*\n\n📌 *Contoh: ${usedPrefix + command} https://twitter.com*`)
}
try {
await global.loading(m, conn)
let response = await fetch(global.API("btz", "/api/download/twitter2", { url }, "apikey"))
if (!response.ok) return m.reply(`💔 *Aku gagal mengambil data dari API. Status:* ${response.status}`)
let json = await response.json()
if (!json || !json.result || (!json.result.mediaURLs && !json.result.media_extended)) {
return m.reply("💔 *Aku nggak nemu konten di link itu, nih. Coba link lain aja ya, sayang!*")
}
let {
mediaURLs = [],
media_extended = [],
text: tweetText,
user_name,
user_screen_name,
tweetURL
} = json.result
let allMedia = [...mediaURLs, ...media_extended.map(media => media.url).filter(url => url)]
if (!allMedia.length) return m.reply("💔 *Tidak ada media yang bisa diunduh dari tweet ini!*")
let media = allMedia[0]
let mimeType = media.includes(".mp4") ? "video/mp4" : "image/jpeg"
let res = await fetch(media)
let buffer = Buffer.from(await res.arrayBuffer())
let fileSize = (buffer.byteLength / 1024).toFixed(2) + " KB"
let caption = `
🌸 *Twitter Downloader* 🌷
━━━━━━━━━━━━━━━━━━━
👤 *User: ${user_name}*
📢 *Screen: @${user_screen_name}*
📏 *Ukuran: ${fileSize}*
📥 *Mengirim media...*
━━━━━━━━━━━━━━━━━━━
`.trim()
let msg = await conn.sendMessage(m.chat, {
text: caption,
contextInfo: {
externalAdReply: {
title: `Tweet dari ${user_name}`,
body: `@${user_screen_name}`,
mediaUrl: tweetURL,
thumbnailUrl: media,
mediaType: 1,
sourceUrl: "https://instagram.com/naruyaizumi_",
renderLargerThumbnail: true
}
}
}, { quoted: m })
for (let media of allMedia) {
await conn.sendMessage(m.chat, 
mimeType === "video/mp4" ? { video: { url: media }, mimetype: mimeType, caption: "🎥 *Video berhasil diunduh!*" } : { image: { url: media }, caption: "🖼️ *Gambar berhasil diunduh!*" }, 
{ quoted: msg })
}
} catch (error) {
console.error(error)
m.reply("💔 *Maaf ya, ada kendala teknis. Aku bakal coba perbaiki, coba lagi nanti ya, sayang!* 🌸")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["twitter"]
handler.tags = ["downloader"]
handler.command = /^(twitter|tw)$/i
handler.limit = true
handler.register = true

export default handler