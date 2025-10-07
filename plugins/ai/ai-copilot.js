let handler = async (m, { conn, text }) => {
  if (!text || typeof text !== "string")
    return m.reply("Enter a valid query for Copilot AI!")

  try {
    await global.loading(m, conn)

    const apiUrl = global.API(
      "btz",
      "/api/search/bing-chat",
      { text },
      "apikey"
    )

    const response = await fetch(apiUrl)
    if (!response.ok)
      return m.reply("Failed to connect to Copilot AI. Try again later.")

    const json = await response.json()
    if (!json.message)
      return m.reply("No response received from Copilot AI.")

    const timestamp = new Date().toTimeString().split(" ")[0]
    const output = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  COPILOT AI RESPONSE`,
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

handler.help = ["copilot"]
handler.tags = ["ai"]
handler.command = /^(copilot)$/i

export default handler