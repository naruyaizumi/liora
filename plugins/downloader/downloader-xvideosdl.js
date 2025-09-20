let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🍔 *Masukkan link video Xvideos untuk diunduh!*\n\n🍱 *Contoh: ${usedPrefix + command} https://www.xvideos.com/...*\n\n⚠️ *WARNING: This feature contains 18+ NSFW content*`)
let url = args[0]
let hostname
try {
    hostname = new URL(url).hostname
} catch {
    return m.reply("🍟 *Link tidak valid!*")
}
// Only allow xvideos.com or its subdomains
if (!(hostname === "xvideos.com" || hostname.endsWith(".xvideos.com"))) return m.reply("🍟 *Link tidak valid!*")
await global.loading(m, conn)
try {
let apiUrl = global.API("btz", "/api/download/xvideosdl", { url }, "apikey")
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status || !json.result?.url) return m.reply("🍤 *Gagal mengambil data video!*")
let { title, views, vote, like_count, dislike_count, url: videoUrl } = json.result
let caption = `
🍙 *Xvideos Downloader*  
━━━━━━━━━━━━━━━
🍜 *Title: ${title}*
🍡 *Views: ${views}*
🍤 *Votes: ${vote}*
🥟 *Likes: ${like_count}*
❌ *Dislikes: ${dislike_count}*
━━━━━━━━━━━━━━━
⚠️ WARNING: This feature contains 18+ NSFW content
`.trim()
let target = m.isGroup ? m.sender : m.chat
await conn.sendFile(target, videoUrl, "video.mp4", caption, m)
if (m.isGroup) m.reply("🍩 *Video terkirim ke private chat kamu!* 🍩")
} catch (e) {
console.error(e)
m.reply("🍧 *Terjadi kesalahan saat mengunduh video!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["xviddl"]
handler.tags = ["downloader"]
handler.command = /^(xviddl)$/i
handler.premium = true

export default handler