
import { uploader } from '../lib/uploader.js'
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, usedPrefix, command }) => {
try {
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!/image\/(jpe?g|png)/.test(mime)) {
return m.reply(`🌸 *Gambar yang kamu kirim tidak didukung!*\n\n✨ *Hanya JPG atau PNG yaa~*`)
}
await global.loading(m, conn)
let media = await q.download()
let linkUpload = await uploader(media).catch(() => null)
if (!linkUpload) return m.reply('🌼 *Gagal mengunggah gambar, coba lagi nanti yaa!*')
let apiUrl = global.API('lol', '/api/creator1/wanted', { img: linkUpload }, 'apikey')
let stickerImage = await sticker(false, apiUrl, global.config.stickpack, global.config.stickauth)
await conn.sendFile(m.chat, stickerImage, 'sticker.webp', m)
} catch (e) {
console.error(e)
m.reply(`❌ *Ada kesalahan saat membuat sticker Wanted!* 🍡`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['wanted']
handler.tags = ['sticker']
handler.command = /^(wanted)$/i
handler.limit = true
handler.register = true

export default handler