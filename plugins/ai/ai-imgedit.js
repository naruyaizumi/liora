import * as cheerio from "cheerio"

async function img2img(buffer, text) {
  const formData = new FormData()
  formData.append("file", new File([buffer], "upload.png", { type: "image/png" }))
  formData.append("text", text)

  const res = await fetch("https://img2img.zone.id/result", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) throw new Error("Upload gagal: " + res.statusText)

  const html = await res.text()
  const $ = cheerio.load(html)
  const img = $("#result").attr("src")

  if (!img) throw new Error("Tidak ada gambar hasil")
  return img
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ""
    if (!/image/.test(mime))
      return m.reply(
        `🖼️ *Balas atau kirim gambar dengan caption!*\n\n📌 Contoh:\n${usedPrefix + command} Ubah jadi karakter figure anime`
      )
    if (!text) return m.reply("🍩 *Tambahkan deskripsi untuk transformasi gambar!*")
    await global.loading(m, conn)
    let buffer = await q.download()
    if (!buffer) return m.reply("❌ *Gagal mengunduh gambar!*")
    let resultUrl = await img2img(buffer, text)
    await conn.sendMessage(
      m.chat,
      {
        image: { url: resultUrl },
        caption: `✨ *Hasil Transformasi*`,
      },
      { quoted: m }
    )
  } catch (e) {
    console.error(e)
    m.reply(`❌ *Terjadi kesalahan:* ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["imgedit"]
handler.tags = ["ai", "image"]
handler.command = /^(imgedit)$/i

export default handler