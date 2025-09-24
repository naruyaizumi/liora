import sharp from 'sharp'

let handler = async (m) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!mime || !/image\/(jpe?g|png|webp)/.test(mime)) {
    return m.reply('🍓 *Reply gambar yang ingin dicek resolusinya!*')
  }

  let media
  try {
    media = await q.download()
    if (!media) return m.reply('🍩 *Gagal mengunduh media!*')
  } catch (e) {
    return m.reply(`🍰 *Terjadi kesalahan saat mengunduh media.*\n\n${e.message}`)
  }

  try {
    let { width, height } = await sharp(media).metadata()
    let result = `
🍬 *CEK RESOLUSI GAMBAR* 🍬
━━━━━━━━━━━━━━━━━━━
🧁 *Ukuran: ${width} × ${height} px*
🍦 *Ukuran file: ${(media.length / 1024).toFixed(2)} KB*
━━━━━━━━━━━━━━━━━━━
`.trim()

    m.reply(result)
  } catch (e) {
    m.reply(`🍡 *Gagal membaca resolusi gambar.*\n\n${e.message}`)
  }
}

handler.help = ['cekresolution']
handler.tags = ['tools']
handler.command = /^(cekreso(lution))$/i

export default handler