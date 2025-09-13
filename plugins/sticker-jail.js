
import { uploader } from '../lib/uploader.js'
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, usedPrefix, command }) => {
try {
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime) return m.reply(`🌸 *Balas gambar dengan perintah*\n\n\`${usedPrefix + command}\``)
if (!/image\/(jpe?g|png)|opus|webp/i.test(mime)) return m.reply(`🍡 *Mime ${mime} tidak didukung untuk fitur ini yaa!*`)
await global.loading(m, conn)
let media = await q.download()
let linkUpload = await uploader(media).catch(() => null)
if (!linkUpload) return m.reply('🍰 *Gagal mengunggah gambar. Coba lagi nanti yaa~*')
let apiUrl = global.API('https://some-random-api.com', '/canvas/overlay/jail', { avatar: linkUpload })
let stiker = await sticker(false, apiUrl, global.config.stickpack, global.config.stickauth)
await conn.sendFile(m.chat, stiker, '', '', m)
} catch (e) {
console.error(e)
m.reply(`🍬 *Upss, ada error!*`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['jail']
handler.tags = ['sticker']
handler.command = /^(jail)$/i
handler.register = true
handler.limit = true

export default handler