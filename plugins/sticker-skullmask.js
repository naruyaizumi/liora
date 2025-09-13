
import { uploader } from '../lib/uploader.js'
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, usedPrefix, command }) => {
try {
await global.loading(m, conn)
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime || !/image\/(jpe?g|png)/.test(mime)) return m.reply(`🌸 *Balas gambar (JPG/PNG) dengan perintah ${usedPrefix + command}*`)
let media = await q.download()
let linkUpload = await uploader(media).catch(() => null)
if (!linkUpload) return m.reply('🍡 *Gagal mengunggah gambar. Coba lagi nanti yaa!*')
let apiUrl = global.API('lol', '/api/editor/skullmask', { img: linkUpload }, 'apikey')
let buffer = Buffer.from(await (await fetch(apiUrl)).arrayBuffer())
let stickerImage = await sticker(buffer, false, global.config.stickpack, global.config.stickauth)
await conn.sendFile(m.chat, stickerImage, 'sticker.webp', '', m)
} catch (e) {
console.error(e)
m.reply('🍰 *Yaaah... gagal memproses stikernya!*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['skullmask']
handler.tags = ['sticker']
handler.command = /^(skullmask)$/i
handler.limit = true
handler.register = true

export default handler