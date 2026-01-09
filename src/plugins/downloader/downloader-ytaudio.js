import { ytmp3 } from "#api/ytmp3.js"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(`Need YouTube URL\nEx: ${usedPrefix + command} https://youtu.be/xxx`)
  }

  const url = args[0]
  const yt = /^(https?:\/\/)?((www|m|music)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i
  if (!yt.test(url)) {
    return m.reply("Invalid YouTube URL")
  }

  await global.loading(m, conn)

  try {
    const { success, downloadUrl, error } = await ytmp3(url)
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

handler.help = ["ytmp3"]
handler.tags = ["downloader"]
handler.command = /^(ytmp3)$/i

export default handler