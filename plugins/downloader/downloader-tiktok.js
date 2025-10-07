let handler = async (m, { conn, usedPrefix, command, args }) => {
  if (!args[0])
    return m.reply(
      `Please provide a valid TikTok URL.\n› Example: ${usedPrefix + command} https://vt.tiktok.com`
    )

  const rawUrl = args[0]
  const isTikTok = /^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(rawUrl)
  if (!isTikTok)
    return m.reply("Invalid URL! Please provide a valid TikTok link.")

  const url = /^https?:\/\/vm\.tiktok\.com(\/|$)/.test(rawUrl)
    ? await resolveTikTokUrl(rawUrl)
    : rawUrl

  try {
    await global.loading(m, conn)

    const resSlide = await fetch(global.API("btz", "/api/download/ttslide", { url }, "apikey"))
    const resVideo = await fetch(global.API("btz", "/api/download/tiktok", { url }, "apikey"))

    const jsonSlide = await resSlide.json()
    const jsonVideo = await resVideo.json()

    if (jsonSlide.status && Array.isArray(jsonSlide.result?.images) && jsonSlide.result.images.length > 0) {
      const images = jsonSlide.result.images
      if (images.length === 1)
        await conn.sendFile(m.chat, images[0], "slide.jpg", null, m)
      else
        await conn.sendAlbum(m.chat, images.map(url => ({ image: { url } })), { quoted: m })
      return
    }

    const videoUrl = jsonVideo?.result?.video?.[0]
    if (jsonVideo.status && videoUrl) {
      await conn.sendFile(m.chat, videoUrl, "tiktok.mp4", null, m)
      return
    }

    m.reply("No downloadable content found. Try another TikTok link.")
  } catch (err) {
    console.error(err)
    m.reply(`An error occurred: ${err.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["tiktok"]
handler.tags = ["downloader"]
handler.command = /^(tiktok|tt)$/i

export default handler

async function resolveTikTokUrl(rawUrl) {
  const res = await fetch(rawUrl, { method: "HEAD", redirect: "follow" })
  return res.url
}