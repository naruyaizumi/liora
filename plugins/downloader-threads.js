
let handler = async (m, { conn, text, args, usedPrefix, command }) => {
let url = text || args[0]
if (!url || !/^https?:\/\/(www\.)?threads\.net\//i.test(url)) {
return m.reply(`🙅‍♀️ *Link Threads tidak valid!*\n\n*Contoh: ${usedPrefix + command} https://www.threads.net*`)
}
try {
await global.loading(m, conn)
let res = await fetch(global.API("btz", "/api/download/threads", { url }, "apikey"))
if (!res.ok) throw new Error(`Gagal mengambil data! Status ${res.status}`)
let json = await res.json()
if (!json.status || !json.result) return m.reply("❌ Gagal mendapatkan konten Threads.")
let { image_urls, video_urls } = json.result
if (Array.isArray(video_urls) && video_urls.length) {
let video = video_urls[0]?.download_url || video_urls[0]
await conn.sendMessage(m.chat, {
video: { url: video },
mimetype: 'video/mp4',
caption: `🎥 *Video Threads berhasil diunduh!*`
}, { quoted: m })
return
}
if (Array.isArray(image_urls) && image_urls.length) {
for (let img of image_urls) {
if (!img) continue
await conn.sendMessage(m.chat, {
image: { url: img },
caption: '',
}, { quoted: m })
}
return
}
m.reply("⚠️ *Konten tidak ditemukan. Coba kirim link lain.*")
} catch (err) {
console.error(err)
m.reply(`❌ *Terjadi kesalahan:*\n${err.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['threads']
handler.tags = ['downloader']
handler.command = /^(threads)$/i
handler.limit = true
handler.register = true

export default handler