let handler = async (m) => {
  try {
    if (!m.quoted)
      return m.reply(`Reply to a message to debug its structure.`)

    let text = safeJson(m.quoted)
    if (text.length > 5000) text = text.slice(0, 5000) + "\n... (truncated)"

    const timestamp = new Date().toTimeString().split(" ")[0]
    const response = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  DEBUG MESSAGE`,
      "└──────────────────────",
      `Quoted From : ${m.quoted?.sender || "Unknown"}`,
      "───────────────────────",
      text,
      "───────────────────────",
      "End of debug output.",
      "```",
    ].join("\n")

    await m.reply(response)
  } catch (error) {
    console.error(error)
    const timestamp = new Date().toTimeString().split(" ")[0]
    const errMsg = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  DEBUG ERROR`,
      "└──────────────────────",
      `! ${error.message}`,
      "───────────────────────",
      "Debug process failed.",
      "```",
    ].join("\n")
    await m.reply(errMsg)
  }
}

handler.help = ["debug"]
handler.tags = ["tool"]
handler.command = /^(getq|q|debug)$/i
handler.mods = true

export default handler

function safeJson(obj) {
  const seen = new WeakSet()
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]"
        seen.add(value)
      }
      if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
        try {
          return Buffer.from(value).toString("base64")
        } catch {
          return `[Array(${value.length})]`
        }
      }
      return value
    },
    2,
  )
}