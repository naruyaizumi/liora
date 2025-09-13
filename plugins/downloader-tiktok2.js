let handler = async (m, { conn, usedPrefix, command, args }) => {
await global.loading(m, conn)
if (!args[0]) return m.reply(`🍙 *Masukkan URL TikTok yang valid!*\n🍣 *Contoh: ${usedPrefix + command} https://vt.tiktok.com/...*`)
const rawUrl = args[0]
const isTikTok = /^(https?:\/\/)?(www\.|vt\.|vm\.|m\.)?tiktok\.com\/.+/i.test(rawUrl)
if (!isTikTok) return m.reply("🍩 *URL tidak valid! Harap masukkan link TikTok yang benar.*")
try {
const nekobyteAPI = `https://api.nekolabs.my.id/downloader/tiktok?url=${rawUrl}`
const response = await fetch(nekobyteAPI)
const json = await response.json()
if (json.status && json.result) {
const { title, cover, music_info, author, musicUrl, videoUrl } = json.result
if (videoUrl) {
let caption = `🍜 *Hasil Unduhan TikTok Video* 🍱\n\n`
caption += `🍙 *Judul: ${title || 'Tidak Ada'}*\n`
caption += `🍡 *Author: ${author.name} (${author.username})*\n`
caption += `🍵 *Musik: ${music_info.title} oleh ${music_info.author}*`
await conn.sendMessage(m.chat, {
video: { url: videoUrl },
mimetype: "video/mp4",
caption: caption
}, { quoted: m })
}
if (musicUrl) {
await conn.sendMessage(m.chat, {
audio: { url: musicUrl },
mimetype: 'audio/mp4',
ptt: true,
fileName: `${music_info.title}.mp3`
}, { quoted: m })
}
} else {
return m.reply("🍰 *Konten tidak bisa diunduh atau API bermasalah. Coba link lain ya~* 🍵")
}
} catch (e) {
console.error(e)
return m.reply(`🍙 *Ada kesalahan teknis!*`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['tiktok2', 'tt2']
handler.tags = ['downloader']
handler.command = /^(tiktok2|tt2)$/i
handler.limit = true
handler.register = true

export default handler