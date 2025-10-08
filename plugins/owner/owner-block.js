let handler = async (m, { text, conn, usedPrefix, command }) => {
  const timestamp = new Date().toTimeString().split(" ")[0]
  const args = text ? text.trim().split(/\s+/) : []

  if (!args.length && !m.mentionedJid?.length && !m.quoted)
    return m.reply(
      `Enter one or more WhatsApp numbers to ${command}.\n› Example: ${usedPrefix + command} 62812xxxx 62813xxxx`
    )

  let targets = []
  if (m.mentionedJid?.length) targets.push(...m.mentionedJid)
  if (m.quoted?.sender) targets.push(m.quoted.sender)
  for (const arg of args) {
    if (/^\d{5,}$/.test(arg))
      targets.push(arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
  }

  targets = [...new Set(targets)]
  if (!targets.length)
    return m.reply(
      `Enter one or more WhatsApp numbers to ${command}.\n› Example: ${usedPrefix + command} 62812xxxx 62813xxxx`
    )

  const results = []
  for (const who of targets) {
    try {
      if (command === "block") await conn.updateBlockStatus(who, "block")
      else if (command === "unblock") await conn.updateBlockStatus(who, "unblock")
      results.push({ who, ok: true })
    } catch (err) {
      results.push({ who, ok: false, err })
    }
  }

  const success = results.filter(r => r.ok).map(r => "@" + r.who.split("@")[0])
  const failed = results.filter(r => !r.ok)

  let textOut = [
    "```",
    `┌─[${timestamp}]────────────`,
    `│  ${command.toUpperCase()}`,
    "└──────────────────────",
    success.length ? `Success : ${success.join(", ")}` : "",
    failed.length ? `Failed  : ${failed.map(r => "@" + r.who.split("@")[0]).join(", ")}` : "",
    failed.length ? "───────────────────────" : "",
    ...failed.map(r => `! ${r.err.message || r.err}`),
    "```",
  ]
    .filter(Boolean)
    .join("\n")

  await conn.sendMessage(m.chat, { text: textOut, mentions: targets }, { quoted: m })
}

handler.help = ["block", "unblock"]
handler.tags = ["owner"]
handler.command = /^(block|unblock)$/i
handler.owner = true

export default handler