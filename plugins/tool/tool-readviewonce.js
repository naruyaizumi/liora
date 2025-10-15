let handler = async (m, { conn }) => {
  const q = m.quoted ? m.quoted : m
  try {
    const buffer = await q.download?.()
    if (!buffer) return m.reply("Failed to retrieve media.")

    const mime = q.mimetype || q.mediaType || ""
    const type = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
      ? "audio"
      : null

    if (!type) return m.reply("Unsupported media type.")

    await conn.sendMessage(
      m.chat,
      {
        [type]: buffer,
        mimetype: mime,
        caption: q.text || "",
      },
      { quoted: m }
    )
  } catch (err) {
    console.error(err)
    m.reply("Error: unable to load media.")
  }
}

handler.help = ["readviewonce"]
handler.tags = ["tools"]
handler.command = /^(read(view(once)?)?|rvo)$/i

export default handler