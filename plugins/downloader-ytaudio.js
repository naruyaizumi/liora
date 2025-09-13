let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("⚠️ *Masukkan URL YouTube yang valid!*")
let url = args[0]
let youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i
if (!youtubeRegex.test(url)) return m.reply("❌ *URL tidak valid! Harap masukkan link YouTube yang benar.*")
try {
await global.loading(m, conn)
let response = await fetch(global.API("btz", "/api/download/ytmp3", { url }, "apikey"))
if (!response.ok) return m.reply("💔 *Gagal menghubungi API. Coba lagi nanti ya!*")
let json = await response.json()
if (!json.status || !json.result || !json.result.mp3) return m.reply("❌ *Gagal memproses permintaan!*\n*Pastikan URL benar dan coba lagi.*")
let { thumb, mp3, source } = json.result
await conn.sendMessage(m.chat, {
audio: { url: mp3 },
mimetype: "audio/mpeg",
ptt: true,
contextInfo: {
externalAdReply: {
title: title,
body: "YouTube Music",
mediaUrl: source,
mediaType: 2,
thumbnailUrl: thumb,
renderLargerThumbnail: true
}
}
}, { quoted: m })
} catch (e) {
console.error(e)
return m.reply("❌ *Terjadi kesalahan saat memproses permintaan.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ytmp3']
handler.tags = ['downloader']
handler.command = /^(ytmp3)$/i
handler.limit = true
handler.register = true

export default handler

function formatDuration(seconds) {
let m = Math.floor(seconds / 60)
let s = seconds % 60
return `${m} menit ${s} detik`
}