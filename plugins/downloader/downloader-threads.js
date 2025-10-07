let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const url = text || args[0]
  if (!url || !/^https?:\/\/(www\.)?threads\.net\//i.test(url))
    return m.reply(
      `Please provide a valid Threads link.\n› Example: ${usedPrefix + command} https://www.threads.net`
    )

  await global.loading(m, conn)

  try {
    const res = await fetch(global.API("btz", "/api/download/threads", { url }, "apikey"))
    if (!res.ok) throw new Error(`Failed to fetch Threads data. Status: ${res.status}`)

    const json = await res.json()
    if (!json.status || !json.result)
      throw new Error("Failed to retrieve Threads content.")

    const { image_urls, video_urls } = json.result

    if (Array.isArray(video_urls) && video_urls.length) {
      const video = video_urls[0]?.download_url || video_urls[0]
      await conn.sendFile(m.chat, video, "threads.mp4", null, m, false, {
        mimetype: "video/mp4",
      })
      return
    }

    if (Array.isArray(image_urls) && image_urls.length) {
      for (const img of image_urls) {
        if (!img) continue
        await conn.sendFile(m.chat, img, "threads.jpg", null, m)
      }
      return
    }

    m.reply("No downloadable content found for this Threads link.")
  } catch (err) {
    console.error(err)
    m.reply(`An error occurred: ${err.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["threads"]
handler.tags = ["downloader"]
handler.command = /^(threads)$/i

export default handler