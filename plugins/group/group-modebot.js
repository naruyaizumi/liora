let handler = async (m, { text, usedPrefix, command }) => {
  const timestamp = new Date().toTimeString().split(" ")[0]
  let chat = global.db.data.chats[m.chat]

  if (!text) {
    const status = chat.mute ? "OFFLINE" : "ONLINE"
    const info = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  BOT STATUS`,
      "└──────────────────────",
      `Current : ${status}`,
      "───────────────────────",
      "Use 'on' or 'off' to change bot mode.",
      "```",
    ].join("\n")
    return m.reply(info)
  }

  switch (text.toLowerCase()) {
    case "off":
    case "mute":
      if (chat.mute)
        return m.reply(
          [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  BOT MODE`,
            "└──────────────────────",
            "Status : ALREADY OFFLINE",
            "───────────────────────",
            "Bot is already muted.",
            "```",
          ].join("\n"),
        )
      chat.mute = true
      return m.reply(
        [
          "```",
          `┌─[${timestamp}]────────────`,
          `│  BOT MODE`,
          "└──────────────────────",
          "Status : MUTED",
          "───────────────────────",
          "Bot is now in silent mode.",
          "```",
        ].join("\n"),
      )

    case "on":
    case "unmute":
      if (!chat.mute)
        return m.reply(
          [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  BOT MODE`,
            "└──────────────────────",
            "Status : ALREADY ONLINE",
            "───────────────────────",
            "Bot is already active.",
            "```",
          ].join("\n"),
        )
      chat.mute = false
      return m.reply(
        [
          "```",
          `┌─[${timestamp}]────────────`,
          `│  BOT MODE`,
          "└──────────────────────",
          "Status : ONLINE",
          "───────────────────────",
          "Bot has been reactivated.",
          "```",
        ].join("\n"),
      )

    default:
      return m.reply(
        [
          "```",
          `┌─[${timestamp}]────────────`,
          `│  BOT MODE`,
          "└──────────────────────",
          `Usage : ${usedPrefix + command} on | off`,
          "───────────────────────",
          "Invalid parameter provided.",
          "```",
        ].join("\n"),
      )
  }
}

handler.help = ["botmode"]
handler.tags = ["group"]
handler.command = /^(bot(mode)?)$/i
handler.owner = true

export default handler