let handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!text)
    return m.reply(
      `Enter the new bio text.\n› Example: ${usedPrefix + command} I am the best bot owned by Izumi.`
    )

  const timestamp = new Date().toTimeString().split(" ")[0]

  try {
    await conn.setStatus(text)
    const response = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  Bio Update`,
      "└──────────────────────",
      `Status : Success`,
      `New Bio: ${text}`,
      "───────────────────────",
      "WhatsApp bot bio updated successfully.",
      "```",
    ].join("\n")

    m.reply(response)
  } catch (e) {
    console.error(e)
    const errorMsg = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  Bio Update`,
      "└──────────────────────",
      `Status : Failed`,
      `Reason : ${e.message}`,
      "───────────────────────",
      "Failed to update WhatsApp bio. Try again later.",
      "```",
    ].join("\n")
    m.reply(errorMsg)
  }
}

handler.help = ["setbiobot"]
handler.tags = ["owner"]
handler.command = /^set(bio(bot)?)$/i
handler.mods = true

export default handler