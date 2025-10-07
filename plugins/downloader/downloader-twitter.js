let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0])
    return m.reply(
      `Please provide a valid Twitter/X URL.\n› Example: ${usedPrefix + command} https://x.com/user/status/1234567890`
    )

  const url = args[0]
  await global.loading(m, conn)

  try {
    const res = await fetch(global.API("btz", "/api/download/twitter2", { url }, "apikey"))
    if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`)

    const json = await res.json()
    if (!json.status || !json.result?.media_extended?.length)
      throw new Error("Unable to process this Twitter/X URL.")

    const { media_extended } = json.result

    for (const media of media_extended) {
      if (media.type === "image")
        await conn.sendFile(m.chat, media.url, "image.jpg", null, m)
      else if (media.type.startsWith("video"))
        await conn.sendFile(m.chat, media.url, "video.mp4", null, m)
    }
  } catch (err) {
    console.error(err)
    m.reply(`An error occurred: ${err.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["twitter"]
handler.tags = ["downloader"]
handler.command = /^(twitter|twdl)$/i

export default handler