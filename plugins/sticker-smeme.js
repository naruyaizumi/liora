import { uploader } from '../lib/uploader.js'
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
await global.loading(m, conn)
try {
if (!args[0]) return m.reply(`🍬 *Masukkan teks atas dan bawah untuk meme! (pakai |)*\n\n✨ *Contoh: ${usedPrefix + command} Atas|Bawah*`)
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime || !/image\/(jpeg|png)/.test(mime)) return m.reply('🍡 *Balas gambar JPG/PNG yang mau dijadikan meme yaa!*')
let media = await q.download()
let up = await uploader(media).catch(() => null)
if (!up) return m.reply('⚠️ *Gagal mengunggah ke server. Coba lagi nanti yaa!*')
let [top, bottom] = args.join(" ").split('|')
top = encodeURIComponent(top || '_')
bottom = encodeURIComponent(bottom || '_')
let apiUrl = `https://api.memegen.link/images/custom/${top}/${bottom}.png?background=${up}`
let buffer = Buffer.from(await (await fetch(apiUrl)).arrayBuffer())
let stickerImage = await sticker(buffer, false, global.config.stickpack, global.config.stickauth)
await conn.sendFile(m.chat, stickerImage, 'sticker.webp', '', m)
} catch (e) {
console.error(e)
m.reply('🍓 *Yaaah, gagal buat meme stikernya!*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['smeme']
handler.tags = ['sticker']
handler.command = /^smeme$/i
handler.premium = true
handler.register = true

export default handler