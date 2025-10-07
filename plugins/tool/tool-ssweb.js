let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (args.length < 2) {
    return m.reply(
      `Enter display mode and URL.\n› Example: ${usedPrefix + command} 1 https://example.com\nAvailable modes:\n1. Desktop\n2. Tablet\n3. Mobile`
    )
  }

  const mode = args[0]
  const url = args.slice(1).join(" ")
  const devices = { 1: "desktop", 2: "tablet", 3: "phone" }

  if (!devices[mode])
    return m.reply(
      "Invalid mode. Choose 1 (Desktop), 2 (Tablet), or 3 (Mobile)."
    )

  await global.loading(m, conn)

  try {
    const device = devices[mode]
    const res = await fetch(global.API("btz", "/api/tools/ssweb", { url, device }, "apikey"))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    const timestamp = new Date().toTimeString().split(" ")[0]

    const caption = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  Screenshot (${device.toUpperCase()})`,
      "└──────────────────────",
      `URL  : ${url}`,
      `Mode : ${device}`,
      "───────────────────────",
      "Screenshot captured successfully.",
      "```"
    ].join("\n")

    await conn.sendMessage(m.chat, { image: buffer, caption }, { quoted: m })
  } catch (e) {
    console.error(e)
    await m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["ssweb <mode> <url>"]
handler.tags = ["tools"]
handler.command = /^(ssweb)$/i

export default handler