let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("🍙 *Masukkan kata kunci pencarian YouTube yang valid!*")
let query = args.join(" ")
try {
await global.loading(m, conn)
let response = await fetch(`https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${query}`)
if (!response.ok) return m.reply("🍩 *Gagal menghubungi API. Coba lagi nanti ya!*")
let json = await response.json()
if (!json.status || !json.result || !json.result.downloadUrl) return m.reply("🍰 *Gagal memproses permintaan!*\n🥟 *Pastikan kata kunci benar dan coba lagi.*")
let { metadata, downloadUrl } = json.result
let { title, channel, duration, cover, url } = metadata
await conn.sendMessage(m.chat, {
audio: { url: downloadUrl },
mimetype: "audio/mpeg",
ptt: true,
contextInfo: {
externalAdReply: {
title: title,
body: `${channel} • ${duration}`,
thumbnailUrl: cover,
mediaUrl: url,
mediaType: 2,
renderLargerThumbnail: true
}
}
}, { quoted: m })
} catch (e) {
console.error(e)
return m.reply("🥪 *Terjadi kesalahan saat memproses permintaan.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ytplay']
handler.tags = ['downloader']
handler.command = /^(ytplay)$/i
handler.limit = true
handler.register = true

export default handler