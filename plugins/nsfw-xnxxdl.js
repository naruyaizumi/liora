
let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply(`🔞 *Masukkan link video XNXX!*\n\n*Contoh: .xnxxdl https://xnxx.com*`)
let url = args[0]
if (!url.includes('xnxx.com')) return m.reply('❌ *Link tidak valid!*')
await global.loading(m, conn)
try {
let res = await fetch(`https://api.hiuraa.my.id/downloader/xnxx?url=${encodeURIComponent(url)}`)
let json = await res.json()
if (!json.status || !json.result || !json.result.videos) throw '❌ *Gagal mengambil data video.*'

let list = Object.entries(json.result.videos).map(([quality, link], i) => [
`${quality}`,
(i + 1).toString(),
`🎞️ *Resolusi: ${quality.toUpperCase()}*`
])
await conn.textList(m.chat, `*🎥 Pilih resolusi video yang ingin diunduh:*`, false, list, m, {
contextInfo: {
externalAdReply: {
title: "Pilih Resolusi Video",
body: "Klik salah satu untuk mengunduh video dari XNXX",
thumbnailUrl: json.result.thumb,
mediaType: 1,
renderLargerThumbnail: true,
sourceUrl: "https://instagram.com/naruyaizumi_",
}
}
})
conn.xnxxDownload = conn.xnxxDownload || {}
conn.xnxxDownload[m.sender] = {
videos: json.result.videos
}
} catch (e) {
console.error(e)
m.reply('❌ *Terjadi kesalahan saat mengambil data video.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.before = async (m, { conn }) => {
conn.xnxxDownload = conn.xnxxDownload || {}
let data = conn.xnxxDownload[m.sender]
if (!data) return
let q = m.text.trim().toLowerCase()
if (!data.videos[q]) return
await conn.sendMessage(m.chat, {
video: { url: data.videos[q] },
caption: `🎞️ *Berikut video dengan resolusi* ${q.toUpperCase()}`
}, { quoted: m })
delete conn.xnxxDownload[m.sender]
}

handler.help = ['xnxxdl']
handler.tags = ['nsfw']
handler.command = /^xnxxdl$/i
handler.nsfw = true
handler.premium = true
handler.age = 18
handler.register = true

export default handler