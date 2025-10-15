import { convert } from "liora-lib"
import decode from "audio-decode"

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!mime || !/^(video|audio)\//.test(mime))
      return m.reply(`Reply a video or audio with command:\n› ${usedPrefix + command}`)

    await global.loading(m, conn)

    const buffer = await q.download?.()
    if (!Buffer.isBuffer(buffer) || buffer.length === 0)
      return m.reply("Failed to get media buffer.")
    const audio = await convert(buffer, {
      format: "opus",
      sampleRate: 48000,
      channels: 1,
      bitrate: "64k",
      ptt: true,
    })
    const finalBuffer =
      audio instanceof Buffer
        ? audio
        : audio?.buffer
        ? Buffer.from(audio.buffer)
        : audio?.data
        ? Buffer.from(audio.data)
        : Buffer.from(audio)
    const audioData = await decode(finalBuffer)
    const channelData = audioData.getChannelData(0)
    const bars = 64
    const blockSize = Math.floor(channelData.length / bars)
    const waveform = new Uint8Array(
      Array.from({ length: bars }, (_, i) => {
        const start = i * blockSize
        const slice = channelData.subarray(start, start + blockSize)
        let peak = 0
        for (let j = 0; j < slice.length; j++) {
          const val = Math.abs(slice[j])
          if (val > peak) peak = val
        }
        return Math.round(255 * peak)
      })
    )

    await conn.sendMessage(
      m.chat,
      {
        audio: finalBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
        waveform,
      },
      { quoted: m }
    )
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