let handler = async (m, { conn }) => {
  const q = m.quoted
  try {
    const mq = q?.mediaMessage

    if (!mq) {
      throw new Error("No media")
    }

    const v = mq.videoMessage || mq.imageMessage || mq.audioMessage

    if (!v) {
      throw new Error("Unsupported type")
    }

    if (!v.viewOnce) {
      throw new Error("Not view-once")
    }

    const buf = await q.download?.()
    if (!buf) {
      throw new Error("Download failed")
    }

    const mime = v.mimetype || ""
    let t
    if (mime.startsWith("image/") || mq.imageMessage) {
      t = "image"
    } else if (mime.startsWith("video/") || mq.videoMessage) {
      t = "video"
    } else if (mime.startsWith("audio/") || mq.audioMessage) {
      t = "audio"
    } else {
      throw new Error("Unsupported type")
    }

    const cap = v.caption || q.text || ""
    const ctx = {}

    if (v.contextInfo?.mentionedJid?.length > 0) {
      ctx.mentionedJid = v.contextInfo.mentionedJid
    }

    const data = buf instanceof Uint8Array 
      ? Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)
      : Buffer.isBuffer(buf) ? buf : Buffer.from(buf || [])

    await conn.sendMessage(
      m.chat,
      {
        [t]: data,
        mimetype: mime,
        caption: cap,
        contextInfo: ctx,
      },
      { quoted: m },
    )
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  }
}

handler.help = ["readviewonce"]
handler.tags = ["tools"]
handler.command = /^(read(view(once)?)?|rvo)$/i

export default handler