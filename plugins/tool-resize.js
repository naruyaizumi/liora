
import sharp from 'sharp'
import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, usedPrefix, args }) => {
try {
let towidth = parseInt(args[0])
let toheight = parseInt(args[1])
if (!towidth) return m.reply('⚠️ *Masukkan ukuran width!*')
if (!toheight) return m.reply('⚠️ *Masukkan ukuran height!*')
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime) return m.reply("⚠️ *Media tidak ditemukan. Reply media yang ingin di-resize!*")
if (!/image\/(jpe?g|png|webp)/.test(mime)) return m.reply(`⚠️ *Format ${mime} tidak didukung!*`)
await global.loading(m, conn)
let media = await q.download()
let before = await sharp(media).metadata()
let resized = await sharp(media)
.resize(towidth, toheight)
.toBuffer()
let beforeLink = await uploader(media)
let afterLink = await uploader(resized)
await conn.sendFile(m.chat, resized, null, `
✨ *COMPRESS & RESIZE* ✨
━━━━━━━━━━━━━━━━━━━
📏 *Sebelum*:
🖼️ *Lebar: ${before.width}px*
🖼️ *Tinggi: ${before.height}px*
━━━━━━━━━━━━━━━━━━━
📐 *Sesudah*:
✂️ *Lebar: ${towidth}px*
✂️ *Tinggi: ${toheight}px*
━━━━━━━━━━━━━━━━━━━
🔗 *Link:*
🌍 *Original: ${beforeLink}*
🚀 *Compressed: ${afterLink}*
`.trim(), m)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['resize']
handler.tags = ['tools']
handler.command = /^resize$/i
handler.register = true
handler.premium = true

export default handler