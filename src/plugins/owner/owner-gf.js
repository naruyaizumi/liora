import { join, extname } from "node:path"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args.length) {
    return m.reply(`Need file path\nEx: ${usedPrefix + command} plugins/owner/owner-sf`)
  }

  try {
    let t = join(...args)
    if (!extname(t)) t += ".js"
    const fp = join(process.cwd(), t)

    const buf = Buffer.from(await Bun.file(fp).arrayBuffer())
    const name = t.split("/").pop()

    await conn.sendMessage(
      m.chat,
      {
        document: buf,
        fileName: name,
        mimetype: "application/javascript",
      },
      { quoted: m },
    )
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  }
}

handler.help = ["getfile"]
handler.tags = ["owner"]
handler.command = /^(getfile|gf)$/i
handler.owner = true

export default handler