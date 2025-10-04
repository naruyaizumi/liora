import { addExif, sticker } from "../../src/bridge.js"

let handler = async (m, { conn, text }) => {
  const q = m.quoted ? m.quoted : m
  if (!q || !/sticker|image|video/.test(q.mtype)) {
    return m.reply("🍡 *Balas stiker, gambar, atau video untuk diganti watermark!*")
  }

  let [packName, authorName] = (text || "").split("|")
  packName = (packName || global.config.stickpack || "").trim()
  authorName = (authorName || global.config.stickauth || "").trim()

  await global.loading(m, conn)
  try {
    const media = await q.download?.()
    if (!media) throw new Error("Download gagal")

    const file = await conn.getFile(media, true)
    const buffer = Buffer.isBuffer(file) ? file : file?.data
    if (!buffer) throw new Error("Buffer kosong")

    let result
    if (buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WEBP") {
      result = await addExif(buffer, { packName, authorName, emojis: [] })
    } else {
      const temp = await sticker(buffer, { packName, authorName })
      result = await addExif(temp, { packName, authorName, emojis: [] })
    }

    await conn.sendFile(m.chat, result, "sticker.webp", "", m, false, { asSticker: true })
  } catch (e) {
    console.error(e)
    m.reply(`🍰 *Ups, gagal pasang watermark!*\n📄 *Error:* ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["watermark"]
handler.tags = ["maker"]
handler.command = /^(wm|watermark)$/i

export default handler