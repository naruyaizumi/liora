import { remini } from "#api/remini.js"

let handler = async (m, { conn, command, usedPrefix }) => {
  const q = m.quoted?.mimetype ? m.quoted : m
  const mime = (q.msg || q).mimetype || ""

  if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
    return m.reply(`Send/reply image.\nEx: ${usedPrefix + command}`)
  }

  try {
    await global.loading(m, conn)
    const img = await q.download()
    if (!img) return m.reply("Invalid image")

    const { success, resultUrl, resultBuffer, error } = await remini(img)
    if (!success) throw new Error(error || "Failed")

    if (resultBuffer) {
      const buffer = Buffer.from(
        resultBuffer.buffer,
        resultBuffer.byteOffset,
        resultBuffer.byteLength
      )
      await conn.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: "Image enhanced",
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        {
          image: { url: resultUrl },
          caption: "Image enhanced",
        },
        { quoted: m }
      )
    }
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["hd"]
handler.tags = ["tools"]
handler.command = /^(remini|hd)$/i

export default handler