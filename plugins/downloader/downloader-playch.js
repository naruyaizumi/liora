import yts from "yt-search"

let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🍱 *Masukkan kata kunci pencarian!* \n\n🍣 *Contoh: ${usedPrefix + command} Serana*`)
let query = args.join(" ")
let ch = global.config.newsletter
if (!ch) return m.reply("🍙 *Newsletter channel belum diset di global.config!*")
await global.loading(m, conn)
try {
let search = await yts(query)
if (!search || !search.videos.length) return m.reply("🍤 *Lagu tidak ditemukan!*")
let video = search.videos[0]
let api = global.API("btz", "/api/download/ytmp3", { url: video.url }, "apikey")
let res = await fetch(api)
if (!res.ok) throw "🍡 *Gagal menghubungi API!*"
let json = await res.json()
if (!json.status || !json.result?.mp3) throw "🍰 *Gagal memproses unduhan!*"
let { mp3, title, thumb, source } = json.result
await conn.sendFile(ch, mp3, `${title}.mp3`, "", m, true, {
mimetype: "audio/mpeg",
contextInfo: {
externalAdReply: {
title: title,
body: video.author.name,
thumbnailUrl: thumb,
mediaUrl: source || video.url,
mediaType: 2,
renderLargerThumbnail: true
}
}
})
await m.reply(`🍙 *Berhasil mengirim lagu ke Channel!*`)
} catch (e) {
console.error(e)
m.reply(typeof e === "string" ? e : "🍩 *Terjadi kesalahan saat memproses permintaan!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["playch"]
handler.tags = ["downloader"]
handler.command = /^(playch)$/i
handler.owner = true

export default handler