import chalk from "chalk"

export default async function (m, conn = { user: {} }) {
  try {
    if (global.db?.data?.settings?.[conn.user?.jid]?.noprint) return
    if (!m || !m.sender || !m.chat || !m.mtype) return

    const senderName = (await conn.getName(m.sender)) || "unknown"
    const chatName = (await conn.getName(m.chat)) || "private"
    const messageType = m.mtype.replace(/message$/i, "").toLowerCase()
    const timestamp = new Date(m.messageTimestamp * 1000)
      .toISOString()
      .replace("T", " ")
      .split(".")[0]
    const tujuan = m.chat.endsWith("@g.us")
      ? "group"
      : m.chat.endsWith("@s.whatsapp.net")
        ? "private"
        : m.chat.endsWith("@broadcast")
          ? "broadcast"
          : m.chat.endsWith("@newsletter")
            ? "channel"
            : "unknown"

    const msg = m.text ? m.text.trim().replace(/\s+/g, " ") : ""
    const truncated = msg.length > 100 ? msg.slice(0, 100) + "..." : msg
    const command = msg.startsWith(".") ? msg.split(" ")[0] : "-"

    const prefix = chalk.gray(`${timestamp}`)
    const tag = chalk.greenBright(`[MSG]`)

    console.log(
      `${prefix} [${m.sender.split("@")[0]}]: ${tag}`
    )
    console.log(
      `  ↳ from: ${chalk.yellow(senderName)}`
    )
    console.log(
      `  ↳ chat: ${chalk.white(chatName)} ${chalk.gray(`[${tujuan}]`)}`
    )
    console.log(
      `  ↳ type: ${chalk.magenta(messageType)}`
    )
    console.log(
      `  ↳ command: ${chalk.green(command)}`
    )
    if (truncated)
      console.log(`  ↳ text: ${chalk.white(truncated)}`)
    console.log(chalk.gray("──────────────────────────────────────"))
  } catch (err) {
    const time = new Date().toISOString().replace("T", " ").split(".")[0]
    console.error(
      `${chalk.gray(time)} ${chalk.cyan("liora.service")}: ${chalk.redBright(
        "[ERROR]"
      )} ${chalk.white(err.message)}`
    )
  }
}