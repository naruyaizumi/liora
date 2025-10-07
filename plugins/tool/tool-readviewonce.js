let handler = async (m, { conn }) => {
  const q = m.quoted ? m.quoted : m
  try {
    const media = await q.download?.()
    if (!media) return m.reply("Failed to retrieve media.")
    await conn.sendFile(m.chat, media, null, q.text || "", m)
  } catch (err) {
    console.error(err)
    m.reply("Error: unable to load media.")
  }
}

handler.help = ["readviewonce"]
handler.tags = ["tools"]
handler.command = /^(read(view(once)?)?|rvo)$/i

export default handler