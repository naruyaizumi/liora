import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, usedPrefix, command }) => {
try {
await global.loading(m, conn)
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime) {
await global.loading(m, conn, true)
return m.reply(`⚠️ *Balas pesan yang berisi file atau media ya sayang~*`)
}
let media = await q.download().catch(() => null)
if (!media) {
await global.loading(m, conn, true)
return m.reply(`⚠️ *Gagal mengunduh media-nya yaa~*`)
}
let uploadedUrl = await uploader(media).catch(() => null)
if (!uploadedUrl) {
await global.loading(m, conn, true)
return m.reply(`⚠️ *Gagal mengunggah file ke server. Coba lagi nanti yaa~*`)
}
let resultText = `
🌟 *File berhasil diunggah!*
━━━━━━━━━━━━━━━━━━━
*☁️ Cloudku Uploader: ${uploadedUrl}*
📏 *Ukuran File: ${(media.length / 1024).toFixed(2)} KB*
`.trim()

await conn.sendMessage(m.chat, {
image: { url: uploadedUrl },
caption: resultText,
footer: global.config.watermark,
interactiveButtons: [
{
name: 'cta_copy',
buttonParamsJson: JSON.stringify({
display_text: `📋 Salin Link`,
copy_code: uploadedUrl
})
}
],
hasMediaAttachment: false
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi kesalahan!*\n📌 *Detail:* ${e.message || e}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['upload']
handler.tags = ['tools']
handler.command = /^(tourl|url)$/i
handler.register = true
handler.limit = true

export default handler