import yts from "yt-search"

let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("🎶 *Masukkan nama lagu atau artis yang ingin kamu cari!*")
let query = args.join(" ")
await global.loading(m, conn)
try {
let search = await yts(query)
if (!search || search.all.length === 0) return m.reply("❌ *Lagu tidak ditemukan!*")
let video = search.all[0]
let api = global.API("btz", "/api/download/ytmp3", { url: video.url }, "apikey")
let res = await fetch(api)
if (!res.ok) return m.reply("❌ *Gagal menghubungi API btz!*")
let json = await res.json()
if (!json.status || !json.result || !json.result.mp3) return m.reply("❌ *Gagal memproses unduhan!*")
let { mp3, title, thumb } = json.result
await conn.sendMessage('120363403399653661@newsletter', {
audio: { url: mp3 },
mimetype: "audio/mpeg",
ptt: true,
fileName: `${title}.mp3`,
contextInfo: {
externalAdReply: {
title: title,
body: video.author.name,
thumbnailUrl: thumb,
mediaUrl: video.url,
mediaType: 1,
renderLargerThumbnail: true
}
}
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply("❌ *Terjadi kesalahan saat memproses permintaan!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["playch2"]
handler.tags = ["sound"]
handler.command = /^(playch2)$/i
handler.owner = true

export default handler