import { uploader3 } from "../../lib/uploader.js"

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(`🍡 *Contoh pemakaian: ${usedPrefix + command} jadikan gaya anime*`)
    }

    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    if (!mime.startsWith('image/')) {
      return m.reply(`🍩 *Balas dengan gambar ya sayang~*`)
    }

    let buffer = await q.download?.().catch(() => null)
    if (!buffer) {
      return m.reply('🧁 *Gagal download gambarnya yaa~*')
    }

    let imageUrl = await uploader3(buffer).catch(() => null)
    if (!imageUrl) {
      return m.reply('🍬 *Gagal upload gambar ke server~*')
    }
    
    await global.loading(m, conn)
    const res = await fetch("https://api.betabotz.eu.org/api/maker/imgedit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        url: imageUrl,
        apikey: global.config.APIKeys["https://api.betabotz.eu.org"]
      })
    })

    const json = await res.json().catch(() => null)
    if (!json || !json.result) {
      await global.loading(m, conn, true)
      return m.reply(`❌ *Gagal edit gambar:*\n${JSON.stringify(json)}`)
    }

    await conn.sendFile(
      m.chat,
      json.result,
      "edit.jpg",
      `🍓✨ *Hasil edit~*\n🍰 *Promt: ${text}*`,
      m
    )
  } catch (e) {
    console.error(e)
    m.reply(`❌ *Terjadi kesalahan!*\n🍡 *Detail:* ${e.message || e}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["imgedit"]
handler.tags = ["ai"]
handler.command = /^(imgedit)$/i

export default handler