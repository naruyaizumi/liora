let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
        `🍡 *Masukkan teks untuk dibuat IQC Image yaa!*\n🍰 *Contoh: ${usedPrefix + command} Liora dan Izumi*`
      )
    }

    await global.loading(m, conn)
    const res = await fetch(
      global.API("btz", "/api/maker/iqc", { text }, "apikey")
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())

    await conn.sendFile(
      m.chat,
      buffer,
      "iqc.jpg",
      `🍓 *Hasil IQC dari teks: ${text}*`,
      m
    )
  } catch (e) {
    console.error(e)
    m.reply(`🍩 *Yaaah ada error!*\n🧁 ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["iqc"]
handler.tags = ["maker"]
handler.command = /^(iqc)$/i

export default handler