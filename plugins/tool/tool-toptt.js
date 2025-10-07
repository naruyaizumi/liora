import { convert } from "../../src/bridge.js"

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!mime || !/^(video|audio)\//.test(mime))
      return m.reply(
        `Reply a video or audio with command:\n› ${usedPrefix + command}`
      )

    await global.loading(m, conn)

    const buffer = await q.download?.()
    if (!Buffer.isBuffer(buffer) || buffer.length === 0)
      return m.reply("Failed to get media buffer.")

    const audio = await convert(buffer, {
      format: "opus",
      sampleRate: 48000,
      channels: 1,
      bitrate: "64k",
    })

    if (!Buffer.isBuffer(audio) || audio.length === 0)
      return m.reply("Conversion failed: empty result.")

    await conn.sendFile(m.chat, audio, "voice.opus", m, true)
  } catch (e) {
    console.error(e)
    m.reply(`Error during conversion:\n${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["toptt"]
handler.tags = ["tools"]
handler.command = /^(toptt|tovn)$/i

export default handler