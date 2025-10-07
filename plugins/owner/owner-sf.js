import fs from "fs"
import path from "path"

let handler = async (m, { args }) => {
  const timestamp = new Date().toTimeString().split(" ")[0]
  if (!args.length) args = ["."]
  const target = path.join(...args)

  if (!m.quoted) {
    if (!fs.existsSync(target))
      return m.reply(`Folder not found: ${target}`)

    const list = fs
      .readdirSync(target)
      .map((name) => {
        const stats = fs.statSync(path.join(target, name))
        return { name, isDir: stats.isDirectory() }
      })
      .sort((a, b) => {
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })
      .map((item) => (item.isDir ? `📁 ${item.name}/` : `📄 ${item.name}`))
      .join("\n")

    const output = [
      "```",
      `Time  : ${timestamp}`,
      `Path  : ${target}`,
      "───────────────────────────",
      list || "(empty directory)",
      "───────────────────────────",
      "Directory listing complete.",
      "```",
    ].join("\n")

    return m.reply(output)
  }

  const q = m.quoted
  const filename = q.fileName || "file.unknown"
  const mime = q.mimetype || ""

  if (!mime && !q.download)
    return m.reply("This message is not a media file, skipping save operation.")

  const buffer = await q.download?.().catch(() => null)
  if (!buffer) return m.reply("Failed to download the quoted file.")

  const fullpath = path.join(target, filename)
  fs.mkdirSync(path.dirname(fullpath), { recursive: true })
  fs.writeFileSync(fullpath, buffer)

  const text = [
    "```",
    `Time : ${timestamp}`,
    `Saved As : ${fullpath}`,
    `Size : ${(buffer.length / 1024).toFixed(2)} KB`,
    "───────────────────────────",
    "File written successfully.",
    "```",
  ].join("\n")

  return m.reply(text)
}

handler.help = ["sf"]
handler.tags = ["owner"]
handler.command = /^(sf|savefile)$/i
handler.mods = true

export default handler