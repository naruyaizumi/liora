let handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!text)
    return m.reply(
      `Enter the new bot name.\n› Example: ${usedPrefix + command} Liora`
    )

  const timestamp = new Date().toTimeString().split(" ")[0]

  try {
    await conn.updateProfileName(text)
    const response = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  Name Update`,
      "└──────────────────────",
      `Status : Success`,
      `New Name: ${text}`,
      "───────────────────────",
      "WhatsApp bot name updated successfully.",
      "```",
    ].join("\n")

    m.reply(response)
  } catch (e) {
    console.error(e)
    const errorMsg = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  Name Update`,
      "└──────────────────────",
      `Status : Failed`,
      `Reason : ${e.message}`,
      "───────────────────────",
      "Failed to update WhatsApp bot name. Try again later.",
      "```",
    ].join("\n")

    m.reply(errorMsg)
  }
}

handler.help = ["setnamebot"]
handler.tags = ["owner"]
handler.command = /^set(name(bot)?)$/i
handler.mods = true

export default handler