
import pkg from "baileys"
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg

const regex = /(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}(?:\/[^\s]*)?)/gi

export default async function before(m, { conn }) {
let user = global.db.data.users[m.sender]
let chat = global.db.data.chats[m.chat]
let setting = global.db.data.settings[conn.user.jid]
if (!m.text || m.isBaileys || m.fromMe) return
if (/^[\/.#!=]|=>|>|\//.test(m.text)) return
if (chat.mute || chat.isBanned || user.banned) return
let text = m.text.replace(/\n+/g, ' ')
let link = text.match(regex)?.[0]
if (!link) return
if (!(chat.autodownload || user.autodownload)) return
conn.autodownload = conn.autodownload || {}
if (conn.autodownload[m.sender]) return
conn.autodownload[m.sender] = true
try {
if (setting.composing) await conn.sendPresenceUpdate('composing', m.chat).catch(() => {})
if (setting.autoread) await conn.readMessages([m.key]).catch(() => {})
if (/tiktok\.com/.test(link)) await Tiktok(conn, m, link)
else if (/instagram\.com/.test(link)) await Instagram(conn, m, link)
} catch (e) {
console.error(e)
} finally {
delete conn.autodownload[m.sender]
}
}

export async function Instagram(conn, m, url) {
try {
if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
return m.reply("🙅‍♀️ *URL tidak valid! Kirimkan link Instagram yang benar, ya.*")
}
let apiUrl = `https://api.hiuraa.my.id/downloader/instagram?url=${url}`
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status || !json.result?.downloadUrl?.length) {
return m.reply("💔 *Konten tidak ditemukan atau link bermasalah. Coba link lain ya, sayang!*")
}
let { caption, username, like, comment } = json.result.metadata
let info = `📸 *Instagram Downloader*
━━━━━━━━━━━━━━━━━━━
👤 *@${username}*
❤️ *${like} suka*
💬 *${comment} komentar*
📝 *Caption:* ${caption || 'Tidak ada'}
━━━━━━━━━━━━━━━━━━━`
let sent = new Set()
for (let mediaUrl of json.result.downloadUrl) {
if (sent.has(mediaUrl)) continue
sent.add(mediaUrl)
let mime = mediaUrl.includes('.mp4') ? 'video' : 'image'
let buffer = await fetch(mediaUrl).then(res => res.buffer())
await conn.sendMessage(m.chat, {
[mime]: buffer,
caption: info,
mimetype: mime === 'video' ? 'video/mp4' : 'image/jpeg'
}, { quoted: m })
}
} catch (err) {
console.error(err)
m.reply("❌ *Terjadi kesalahan teknis saat mengunduh. Coba lagi nanti ya!*")
}
}

export async function Tiktok(conn, m, url) {
try {
let isTikTok = /^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url)
if (!isTikTok) return m.reply("❌ *URL tidak valid! Harap masukkan link TikTok yang benar.*")
let resSlide = await fetch(global.API("btz", "/api/download/ttslide", { url }, "apikey"))
let resVideo = await fetch(global.API("btz", "/api/download/tiktok", { url }, "apikey"))
let jsonSlide = await resSlide.json()
let jsonVideo = await resVideo.json()
if (jsonSlide.status && jsonSlide.result.images.length > 0) {
let batchSize = 10
for (let i = 0; i < jsonSlide.result.images.length; i += batchSize) {
let batch = jsonSlide.result.images.slice(i, i + batchSize)
let slides = []
for (let img of batch) {
let media = await prepareWAMessageMedia({ image: { url: img } }, { upload: conn.waUploadToServer })
slides.push({
header: proto.Message.InteractiveMessage.Header.fromObject({
hasMediaAttachment: true,
...media
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "🌐 Link Gambar",
url: img,
merchant_url: "https://www.tiktok.com"
})
}]
})
})
}
let msg = await generateWAMessageFromContent(m.chat, {
viewOnceMessageV2Extension: {
message: {
messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
interactiveMessage: proto.Message.InteractiveMessage.fromObject({
body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📸 *Hasil Slide TikTok*` }),
carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards: slides })
})
}
}}, { userJid: m.sender, quoted: m })
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}
if (jsonSlide.result.audio.length > 0) {
await conn.sendMessage(m.chat, {
audio: { url: jsonSlide.result.audio[0] },
mimetype: "audio/mpeg",
fileName: "tiktok.mp3"
}, { quoted: m })
}
return
}
if (jsonVideo.status && jsonVideo.result.video.length > 0) {
await conn.sendMessage(m.chat, {
video: { url: jsonVideo.result.video[0] },
mimetype: "video/mp4",
caption: "🎥 *Hasil Video TikTok*"
}, { quoted: m })
if (jsonVideo.result.audio.length > 0) {
await conn.sendMessage(m.chat, {
audio: { url: jsonVideo.result.audio[0] },
mimetype: "audio/mpeg",
fileName: "tiktok.mp3"
}, { quoted: m })
}
return
}
m.reply("💔 *Konten tidak ditemukan. Coba link lain, ya sayang~*")
} catch (e) {
console.error(e)
m.reply("❌ *Terjadi error saat mengunduh konten TikTok!*")
}
}