import path from "node:path"

let handler = async (m, { args, usedPrefix, command }) => {
  if (!args.length) {
    return m.reply(`Need file path\nEx: ${usedPrefix + command} plugins/owner/owner-sf`)
  }

  let t = path.join(...args)
  if (!path.extname(t)) t += ".js"
  const fp = path.resolve(process.cwd(), t)

  try {
    const f = Bun.file(fp)
    const ex = await f.exists()
    if (!ex) throw new Error(`File not found: ${fp}`)

    await f.delete()
    m.reply("File deleted")
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  }
}

handler.help = ["deletefile"]
handler.tags = ["owner"]
handler.command = /^(df|deletefile)$/i
handler.owner = true

export default handler