import { readdir, mkdir } from "node:fs/promises"
import path from "node:path"

const handler = async (m, { args }) => {
  try {
    let t = args.length
      ? path.join(process.cwd(), ...args)
      : process.cwd()
    t = path.resolve(t)

    if (!m.quoted) {
      const items = await readdir(t, { withFileTypes: true }).catch(() => null)
      if (!items) return m.reply(`Folder not found: ${t}`)

      const list =
        items
          .sort((a, b) =>
            a.isDirectory() === b.isDirectory()
              ? a.name.localeCompare(b.name)
              : a.isDirectory()
                ? -1
                : 1,
          )
          .map(
            (i) =>
              `${i.isDirectory() ? "📁" : "📄"} ${i.name}${i.isDirectory() ? "/" : ""}`,
          )
          .join("\n") || "(empty)"
      return m.reply(`Path: ${t}\n\n${list}`)
    }

    const q = m.quoted
    const mime = q.mimetype || q.mediaType || ""
    if (!q?.download || !/^(image|video|audio|application)/.test(mime)) {
      return m.reply("Need media or document")
    }

    const buf = await q.download().catch(() => null)
    if (!buf?.length) return m.reply("Download failed")

    const ext =
      mime?.split("/")[1] || path.extname(q.fileName || "")?.slice(1) || "bin"
    const name = q.fileName
      ? path.basename(q.fileName)
      : `file-${Date.now()}.${ext}`
    const fp = path.resolve(t, name)
    await mkdir(path.dirname(fp), { recursive: true })
    await Bun.write(fp, buf)
    return m.reply(`Saved: ${path.relative(process.cwd(), fp)}`)
  } catch (e) {
    return m.reply(`Error: ${e.message}`)
  }
}

handler.help = ["sf"]
handler.tags = ["owner"]
handler.command = /^(sf|savefile)$/i
handler.owner = true

export default handler