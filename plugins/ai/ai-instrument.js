import { uploader } from "../../lib/uploader.js"

let handler = async (m, { conn }) => {
  try {
    await global.loading(m, conn)

    const q = m.quoted ? m.quoted : m
    const media = await q.download?.().catch(() => null)
    if (!media) return m.reply("🍩 *Gagal mengunduh audio!*")

    const linkUpload = await uploader(media).catch(() => null)
    if (!linkUpload)
      return m.reply("🍰 *Gagal mengunggah audio. Coba lagi nanti!*")

    await m.reply(
      `🍡 *Proses Ekstraksi Audio...* 

🍙 *Mohon tunggu sebentar, sedang memisahkan vokal dan instrumental dari audio yang dikirim.*`
    )

    const apiUrl = global.API(
      "btz",
      "/api/tools/voiceremover",
      { url: linkUpload },
      "apikey"
    )

    const response = await fetch(apiUrl)
    if (!response.ok)
      return m.reply("🍜 *Terjadi kesalahan saat memproses audio. Coba lagi nanti!*")

    const json = await response.json()
    if (json.result?.error || !json.result?.vocal_path || !json.result?.instrumental_path)
      return m.reply("🍪 *Gagal mengekstrak audio. Coba lagi nanti!*")

    const { vocal_path, instrumental_path } = json.result

    await conn.sendFile(
      m.chat,
      instrumental_path,
      "instrumental.opus",
      "",
      m,
      true
    )
    
    await conn.sendFile(
      m.chat,
      vocal_path,
      "vocal.opus",
      "",
      m,
      true
    )

  } catch (e) {
    console.error(e)
    m.reply(`🍬 *Terjadi Kesalahan Teknis!*\n🍱 *Detail:* ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["instrument"]
handler.tags = ["ai"]
handler.command = /^(instrument|voiceremove)$/i

export default handler