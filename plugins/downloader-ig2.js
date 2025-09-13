let handler = async (m, { conn, usedPrefix, command, args }) => {
await global.loading(m, conn)
if (!args[0]) return m.reply(`🍙 *Masukkan URL Instagram Reels yang valid!*\n🍣 *Contoh: ${usedPrefix + command} https://www.instagram.com/reel/...*`)
const url = args[0]
if (!/^https?:\/\/(www\.)?instagram\.com\/reel\//i.test(url)) {
return m.reply("🍩 *URL tidak valid! Saat ini IGDL v2 hanya mendukung link Instagram Reels.* 🍱")
}
try {
const apiUrl = `https://api.nekolabs.my.id/downloader/instagram?url=${url}`
const response = await fetch(apiUrl)
const json = await response.json()
if (!json.status || !json.result?.downloadUrl) {
return m.reply("🍰 *Gagal memproses link Reels ini.* Coba link lain ya~ 🍵")
}
let { caption, username, like, comment, isVideo } = json.result.metadata
let downloadList = json.result.downloadUrl
if (!isVideo) return m.reply("🍙 *Konten ini bukan video, hanya Reels video yang didukung.*")
let cap = `🍱 *Instagram Reels Downloader*\n\n`
cap += `🍙 *User: ${username}*\n`
cap += `🍵 *Likes: ${like}* ❤️\n`
cap += `🍡 *Comments: ${comment}* 💬\n`
cap += `🍰 *Caption: ${caption || '-'}*\n`
await conn.sendMessage(m.chat, {
video: { url: downloadList[0] },
mimetype: 'video/mp4',
caption: cap
}, { quoted: m })
} catch (e) {
console.error(e)
return m.reply("🍜 *Terjadi kesalahan teknis saat memproses Reels.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['instagram2']
handler.tags = ['downloader']
handler.command = /^(instagram2|ig2|igdl2)$/i
handler.limit = true
handler.register = true

export default handler