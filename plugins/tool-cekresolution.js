
import sharp from 'sharp'

let handler = async (m) => {
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime || !/image\/(jpe?g|png|webp)/.test(mime)) return m.reply('⚠️ *Reply gambar yang ingin dicek resolusinya!*')
let media
try {
media = await q.download()
if (!media) return m.reply('⚠️ *Gagal mengunduh media!*')
} catch {
return m.reply('⚠️ *Terjadi kesalahan saat mengunduh media.*')
}
try {
let { width, height } = await sharp(media).metadata()
let result = `
📐 *RESOLUSI GAMBAR*
━━━━━━━━━━━━━━━━━━━
📏 *Ukuran: ${width} x ${height}*
📌 *Ukuran file: ${(media.length / 1024).toFixed(2)} KB*
━━━━━━━━━━━━━━━━━━━
`.trim()
m.reply(result)
} catch {
m.reply('⚠️ *Gagal membaca resolusi gambar. Pastikan itu gambar valid.*')
}
}

handler.help = ['cekresolution']
handler.tags = ['tools']
handler.command = /^(cekreso(lution)?)$/i
handler.register = true
handler.premium = true

export default handler