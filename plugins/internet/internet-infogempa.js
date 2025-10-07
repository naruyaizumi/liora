let handler = async (m, { conn }) => {
  await global.loading(m, conn)
  try {
    const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")
    const json = await res.json()
    const data = json.Infogempa.gempa

    const timestamp = new Date().toTimeString().split(" ")[0]
    const mmi = data.Dirasakan
      ? `${data.Dirasakan} Skala MMI`
      : "Tidak ada data"
    const teks = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  EARTHQUAKE REPORT (BMKG)`,
      "└──────────────────────",
      `Tanggal    : ${data.Tanggal}`,
      `Waktu (WIB): ${data.Jam}`,
      `Waktu (UTC): ${data.DateTime}`,
      `Lokasi     : ${data.Wilayah}`,
      `Koordinat  : ${data.Coordinates}`,
      `Magnitudo  : ${data.Magnitude}`,
      `Kedalaman  : ${data.Kedalaman}`,
      `Potensi    : ${data.Potensi}`,
      "───────────────────────",
      `Dirasakan  : ${mmi}`,
      "───────────────────────",
      "Sumber     : BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)",
      "```",
    ].join("\n")

    await conn.sendFile(
      m.chat,
      `https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}`,
      "shakemap.jpg",
      teks,
      m
    )
  } catch (e) {
    console.error(e)
    await m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["infogempa"]
handler.tags = ["internet"]
handler.command = /^(infogempa)$/i

export default handler