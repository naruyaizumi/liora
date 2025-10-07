let handler = async (m, { conn, text }) => {
  if (!text || typeof text !== "string")
    return m.reply("Enter a valid query for Blackbox AI!")

  try {
    await global.loading(m, conn)

    const apiUrl = global.API(
      "btz",
      "/api/search/blackbox-chat",
      { text },
      "apikey"
    )

    const response = await fetch(apiUrl)
    if (!response.ok)
      return m.reply("Failed to process the request. Try again later.")

    const json = await response.json()
    if (!json.message)
      return m.reply("No response received from Blackbox AI.")

    const timestamp = new Date().toTimeString().split(" ")[0]
    const output = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  BLACKBOX AI RESPONSE`,
      "└──────────────────────",
      `> Query: ${text}`,
      "───────────────────────",
      json.message.trim(),
      "───────────────────────",
      "```",
    ].join("\n")

    await conn.sendMessage(m.chat, { text: output }, { quoted: m })
  } catch (error) {
    console.error(error)
    m.reply("Error: " + error.message)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["blackbox"]
handler.tags = ["ai"]
handler.command = /^(blackbox|blackboxai)$/i

export default handler