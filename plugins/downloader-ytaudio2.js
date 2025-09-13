let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("⚠️ *Masukkan URL YouTube yang valid!*")
let url = args[0]
let youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i
if (!youtubeRegex.test(url)) return m.reply("❌ *URL tidak valid! Harap masukkan link YouTube yang benar.*")
try {
await global.loading(m, conn)
const nekobyteAPI = `https://api.nekolabs.my.id/downloader/youtube/v1?url=${url}&format=mp3`
const response = await fetch(nekobyteAPI)
if (!response.ok) return m.reply("💔 *Gagal menghubungi API. Coba lagi nanti ya!*")
const json = await response.json()
if (!json.status || !json.result || !json.result.download) {
return m.reply("❌ *Gagal memproses permintaan!*\n*Pastikan URL benar dan coba lagi.*")
}
const { title, cover, download } = json.result
await conn.sendMessage(m.chat, {
audio: { url: download },
mimetype: "audio/mpeg",
ptt: true,
contextInfo: {
externalAdReply: {
title: title,
body: "Download Audio",
thumbnailUrl: cover,
mediaUrl: url,
mediaType: 2,
renderLargerThumbnail: true
}
}
}, { quoted: m })
} catch (e) {
console.error(e)
return m.reply("❌ Terjadi kesalahan saat memproses permintaan.")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ytmp32']
handler.tags = ['downloader']
handler.command = /^(ytmp32)$/i
handler.limit = true
handler.register = true

export default handler
