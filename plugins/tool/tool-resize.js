import sharp from "sharp"

let handler = async (m, { conn, args }) => {
  try {
    let towidth = parseInt(args[0])
    let toheight = parseInt(args[1])
    if (!towidth) return m.reply("🍓 *Masukkan ukuran width!*")
    if (!toheight) return m.reply("🍰 *Masukkan ukuran height!*")

    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ""
    if (!mime) return m.reply("🍩 *Media tidak ditemukan. Kirim/reply gambar yang ingin di-resize!*")
    if (!/image\/(jpe?g|png|webp)/.test(mime)) {
      return m.reply(`🧁 *Format ${mime} tidak didukung!*`)
    }

    await global.loading(m, conn)

    const media = await q.download()
    if (!media || !media.length) return m.reply("🍪 *Gagal download media!*")
    const before = await sharp(media).metadata()
    const resized = await sharp(media)
      .resize(towidth, toheight, { fit: "inside" })
      .toBuffer()
    const after = await sharp(resized).metadata()

    await conn.sendMessage(m.chat, {
      image: resized,
      caption: `
🍬 *COMPRESS & RESIZE* 🍬
━━━━━━━━━━━━━━━━━━━
🍓 *Sebelum:*
🍧 *Lebar: ${before.width}px*
🍧 *Tinggi: ${before.height}px*
━━━━━━━━━━━━━━━━━━━
🧁 *Sesudah:*
🍦 *Lebar: ${after.width}px*
🍦 *Tinggi: ${after.height}px*
`.trim()
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    await m.reply(`🍨 *Gagal resize:* ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["resize"]
handler.tags = ["tools"]
handler.command = /^(resize)$/i

export default handler