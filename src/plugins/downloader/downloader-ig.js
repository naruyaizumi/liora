import { instagram } from "#api/instagram.js"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0]
  if (!url) {
    return m.reply(`Need Instagram URL\nEx: ${usedPrefix + command} https://instagram.com/p/xxx`)
  }

  if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
    return m.reply("Invalid Instagram URL")
  }
  
  if (/\/stories\//i.test(url)) {
    return m.reply("No stories support")
  }

  await global.loading(m, conn)

  try {
    const { success, type, urls, error } = await instagram(url)
    if (!success) throw new Error(error || "Failed")

    if (type === "video") {
      await conn.sendMessage(
        m.chat,
        { video: { url: urls[0] }, mimetype: "video/mp4" },
        { quoted: m },
      )
    } else if (type === "images") {
      if (urls.length === 1) {
        await conn.sendMessage(
          m.chat,
          { image: { url: urls[0] } },
          { quoted: m },
        )
      } else {
        const album = urls.map((img, i) => ({
          image: { url: img },
          caption: `${i + 1}/${urls.length}`,
        }))
        await conn.client(m.chat, album, { quoted: m })
      }
    }
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["instagram"]
handler.tags = ["downloader"]
handler.command = /^(instagram|ig)$/i

export default handler