import { spotifydl } from "#api/spotifydl.js"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(`Need Spotify URL\nEx: ${usedPrefix + command} https://open.spotify.com/track/xxx`)
  }

  const url = args[0]
  const spotify = /^https?:\/\/open\.spotify\.com\/track\/[\w-]+(\?.*)?$/i
  if (!spotify.test(url)) {
    return m.reply("Invalid Spotify URL")
  }

  await global.loading(m, conn)

  try {
    const { success, downloadUrl, error } = await spotifydl(url)
    if (!success) throw new Error(error)

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: downloadUrl },
        mimetype: "audio/mpeg",
      },
      { quoted: m },
    )
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["spotifydl"]
handler.tags = ["downloader"]
handler.command = /^(spotifydl)$/i

export default handler