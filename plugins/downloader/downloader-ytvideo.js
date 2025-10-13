import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0])
    return m.reply(
      `Please provide a valid YouTube video link.\n› Example: ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ`
    )

  const url = args[0]
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i
  if (!youtubeRegex.test(url))
    return m.reply("Invalid URL! Please provide a valid YouTube video link.")

  const headers = { "X-API-Key": global.config.ytdl }
  await global.loading(m, conn)

  try {
    const apiUrl = global.API("btz", "/api/download/ytmp4", { url }, "apikey")
    const res = await fetch(apiUrl, { headers })
    if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`)

    const json = await res.json()
    if (!json.status || !json.result || !json.result.mp4)
      return m.reply("Failed to process the request. Please check the URL and try again.")

    const { mp4, title } = json.result

    await conn.sendFile(
      m.chat,
      mp4,
      `${title || "video"}.mp4`,
      `Video: ${title}`,
      m,
      false,
      { mimetype: "video/mp4" }
    )
  } catch (err) {
    console.error(err)
    m.reply(`Error while downloading: ${err.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["ytmp4"]
handler.tags = ["downloader"]
handler.command = /^(ytmp4)$/i

export default handler