import fs from "fs"
import path from "path"

let handler = async (m, { args, usedPrefix, command }) => {
  const timestamp = new Date().toTimeString().split(" ")[0]

  if (!args.length)
    return m.reply(
      `Enter the file or folder path to delete.\n` +
      `› Example: ${usedPrefix + command} plugins owner owner-sf`
    )

  let target = path.join(...args)
  if (!path.extname(target)) target += ".js"

  if (!fs.existsSync(target))
    return m.reply(`File or folder not found: ${target}`)

  const isDir = fs.statSync(target).isDirectory()

  try {
    if (isDir) {
      fs.rmSync(target, { recursive: true, force: true })
    } else {
      fs.unlinkSync(target)
    }

    const caption = [
      "```",
      `Time   : ${timestamp}`,
      `Path   : ${target}`,
      `Type   : ${isDir ? "Directory" : "File"}`,
      "───────────────────────────",
      "Operation completed.",
      "```",
    ].join("\n")

    return m.reply(caption)
  } catch (err) {
    return m.reply(`An error occurred.\n${err.message}`)
  }
}

handler.help = ["df <path>"]
handler.tags = ["owner"]
handler.command = /^(df|deletefile)$/i
handler.mods = true

export default handler