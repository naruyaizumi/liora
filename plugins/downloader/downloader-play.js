import { fetch } from "../../src/bridge.js"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0])
    return m.reply(
      `Please provide a song title to search.\n› Example: ${usedPrefix + command} Swim`
    )

  const query = args.join(" ")
  const headers = { "X-API-Key": global.config.ytdl }
  await global.loading(m, conn)

  try {
    const search = await fetch(`https://cloudkutube.eu/search?q=${query}`, { headers })
    if (!search.ok) throw new Error(`HTTP ${search.status}`)

    const json = await search.json()
    const video = json?.data?.[0]
    if (!video?.url) return m.reply("No video results found.")

    const videoUrl = video.url
    const title = video.title || "YouTube Audio"
    const channel = video.channel?.name || "Unknown Channel"
    const thumbnail = video.thumbnail || null
    const duration = video.duration?.formatted || "Unknown"

    const dlUrl = `https://cloudkutube.eu/ytmp3?url=${videoUrl}&buffer=true`
    const res = await fetch(dlUrl, { headers })
    if (!res.ok) throw new Error(`Failed to fetch audio: HTTP ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())

    await conn.sendFile(m.chat, buffer, `${title}.mp3`, null, m, true, {
      mimetype: "audio/mpeg",
      contextInfo: {
        externalAdReply: {
          title,
          body: `${channel} • ${duration}`,
          thumbnailUrl: thumbnail,
          mediaUrl: videoUrl,
          mediaType: 2,
          renderLargerThumbnail: true,
        },
      },
    })
  } catch (err) {
    console.error(err)
    m.reply(`Error while downloading: ${err.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["play"]
handler.tags = ["downloader"]
handler.command = /^(play)$/i

export default handler