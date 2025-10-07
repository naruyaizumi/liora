import fs from "fs"
import { execSync } from "child_process"

let handler = async (m, { conn }) => {
  try {
    const tempDir = "./tmp"
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const files = fs.readdirSync(tempDir)
    for (const file of files) fs.unlinkSync(`${tempDir}/${file}`)

    const timestamp = new Date().toTimeString().split(" ")[0]
    const backupName = "liora"
    const backupPath = `${tempDir}/${backupName}.zip`

    await m.reply(
      [
        "```",
        `┌─[${timestamp}]────────────`,
        `│  System Backup`,
        "└──────────────────────",
        "Creating compressed archive...",
        "Collecting files and directories...",
        "───────────────────────",
        "Status : In Progress",
        "```",
      ].join("\n"),
    )

    const exclude = ["node_modules", "auth", "tmp"]
    const ls = execSync("ls")
      .toString()
      .split("\n")
      .filter((pe) => pe && !exclude.includes(pe))
    execSync(`zip -r ${backupPath} ${ls.join(" ")}`)

    await conn.sendMessage(
      m.sender,
      {
        document: fs.readFileSync(backupPath),
        fileName: `${backupName}.zip`,
        mimetype: "application/zip",
      },
      { quoted: m },
    )

    fs.unlinkSync(backupPath)

    if (m.chat !== m.sender)
      return m.reply(
        [
          "```",
          `┌─[${timestamp}]────────────`,
          `│  Backup Complete`,
          "└──────────────────────",
          "File sent to your private chat.",
          "Status : Success",
          "```",
        ].join("\n"),
      )
  } catch (err) {
    console.error(err)
    await m.reply(
      [
        "```",
        "┌─[ERROR]──────────────",
        "│  Backup Failed",
        "└──────────────────────",
        `Message : ${err.message}`,
        "Status  : Failed",
        "```",
      ].join("\n"),
    )
  }
}

handler.help = ["backup"]
handler.tags = ["owner"]
handler.command = /^(backup|bk)$/i
handler.mods = true

export default handler