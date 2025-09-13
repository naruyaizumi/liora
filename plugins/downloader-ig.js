import { fileTypeFromBuffer } from 'file-type'

let handler = async (m, { conn, usedPrefix, command, args }) => {
await global.loading(m, conn)
if (!args[0]) return m.reply(`⚠️ *Masukkan URL Instagram yang valid!*\nContoh: ${usedPrefix + command} https://www.instagram.com/p/...`)
const url = args[0]
if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) return m.reply("🙅‍♀️ *URL tidak valid! Kirimkan link Instagram yang benar, ya.*")
const json = await fetch(global.API("btz", "/api/download/igdowloader", { url }, "apikey")).then(res => res.json())
if (!json.status || !json.message || json.message.length === 0) return m.reply("💔 *Kontennya nggak ditemukan. Coba link lain ya, sayang!*")
let sent = new Set()
let images = []
let videos = []
for (let content of json.message) {
if (!content._url || sent.has(content._url)) continue
sent.add(content._url)
try {
let res = await fetch(content._url)
let buffer = Buffer.from(await res.arrayBuffer())
let file = await fileTypeFromBuffer(buffer)
if (!file) continue
if (file.mime.startsWith('image')) images.push(content._url)
else if (file.mime.startsWith('video')) videos.push(content._url)
else console.warn('🟠 Konten tidak dikenal:', file.mime)
} catch (err) {
console.error('❌ Gagal analisis konten:', content._url)
}
}
if (images.length === 1) {
await conn.sendMessage(m.chat, {
image: { url: images[0] },
caption: `🖼️ *Foto Instagram berhasil diunduh!*`
}, { quoted: m })
} else if (images.length > 1) {
let cards = []
for (let i = 0; i < images.length; i++) {
cards.push({
image: { url: images[i] },
title: `📷 Instagram Gambar (${i + 1}/${images.length})`,
body: "Klik tombol di bawah buat lihat di Instagram 💗",
footer: "",
buttons: [
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🌐 Buka di Instagram',
url
})
}
]
})
}
await conn.sendMessage(m.chat, {
text: '🖼️ Hasil Gambar dari Instagram',
title: 'Instagram Downloader 📸',
subtitle: 'Slide Gambar',
footer: 'Diproses oleh Izumi Tools',
cards
}, { quoted: m })
}
if (videos.length === 1) {
await conn.sendMessage(m.chat, {
video: { url: videos[0] },
caption: `🎥 *Video Instagram berhasil diunduh!*`
}, { quoted: m })
} else if (videos.length > 1) {
let cards = []
for (let i = 0; i < videos.length; i++) {
cards.push({
video: { url: videos[i] },
title: `🎞️ Instagram Video (${i + 1}/${videos.length})`,
body: "Klik tombol di bawah buat lihat langsung di Instagram 💫",
footer: "",
buttons: [
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🌐 Buka di Instagram',
url
})
}
]
})
}
await conn.sendMessage(m.chat, {
text: '🎥 Hasil Video dari Instagram',
title: 'Instagram Downloader 📽️',
subtitle: 'Slide Video',
footer: 'Diproses oleh Izumi Tools',
cards
}, { quoted: m })
}
await global.loading(m, conn, true)
}

handler.help = ['instagram']
handler.tags = ['downloader']
handler.command = /^(instagram|ig|igdl)$/i
handler.limit = true
handler.register = true

export default handler