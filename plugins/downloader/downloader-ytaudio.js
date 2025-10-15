import { fetch } from "liora-lib"

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

  await global.loading(m, conn)

  try {
    const apiUrl = global.API("btz", "/api/download/ytmp3", { url }, "apikey")
    const res = await fetch(apiUrl)
    if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`)

    const json = await res.json()
    if (!json.status || !json.result?.mp3)
      return m.reply("Failed to process request. Please try again later.")

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: json.result.mp3 },
        mimetype: "audio/mpeg",
        fileName: `${json.result.title || "track"}.mp3`,
      },
      { quoted: m }
    )
  } catch (err) {
    console.error(err)
    m.reply(`Error while downloading: ${err.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["ytmp3"]
handler.tags = ["downloader"]
handler.command = /^(ytmp3)$/i

export default handler