
import fs from 'fs'
import path from 'path'
import { Spotify } from 'day-canvas'

let handler = async (m, { conn, args }) => {
if (!args[0] || !args[0].startsWith('http')) return m.reply('🔗 *Berikan link lagu Spotify yang valid!*')
await global.loading(m, conn)
try {
let res = await fetch(global.API("btz", "/api/download/spotify", { url: args[0] }, "apikey"))
let json = await res.json()
if (!json.status || !json.result?.data?.url) return m.reply("❌ *Gagal mengunduh lagu!*")
let { title, artist, duration, thumbnail, url } = json.result.data
let [min, sec] = duration.split(':').map(Number)
let durationMs = (min * 60 + sec) * 1000
let formattedDuration = `${min}:${String(sec).padStart(2, "0")}`
let buffer = await new Spotify()
.setAuthor(artist?.name || "Unknown")
.setAlbum("Spotify Music")
.setTimestamp(1000,durationMs)
.setImage(thumbnail)
.setTitle(title)
.setBlur(1)
.setOverlayOpacity(0.8)
.build()
await conn.sendMessage(m.chat, {
image: buffer,
caption: `✨ *Spotify Music* ✨
━━━━━━━━━━━━━━━━━━━
🎵 *Judul: ${title}*
🎤 *Artis: ${artist?.name || "Tidak Diketahui"}*
⏱️ *Durasi: ${formattedDuration}*
🔗 *URL: ${args[0]}*
━━━━━━━━━━━━━━━━━━━
💡 *Lagu sedang diproses untuk diunduh. Harap tunggu sebentar!* 🌸
`.trim(),
contextInfo: {
externalAdReply: {
title: title,
body: `${artist?.name || "Spotify"} | ${title}`,
thumbnailUrl: thumbnail,
mediaType: 1,
renderLargerThumbnail: true
}
}
}, { quoted: m })
await conn.sendMessage(m.chat, {
audio: { url },
mimetype: "audio/mpeg",
ptt: true,
fileName: `${title}.mp3`,
contextInfo: {
externalAdReply: {
title: title,
body: `${artist?.name || "Spotify"} | ${title}`,
thumbnailUrl: thumbnail,
mediaUrl: args[0],
mediaType: 1,
renderLargerThumbnail: true
}
}
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply("❌ *Terjadi kesalahan saat mengunduh lagu.*")
}
await global.loading(m, conn, true)
}

handler.help = ['spotifydl']
handler.tags = ['downloader']
handler.command = /^(spotifydl|spdl)$/i
handler.register = true
handler.limit = true

export default handler