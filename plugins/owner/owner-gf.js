import { join, extname } from "path"
import { readFileSync, existsSync } from "fs"

let handler = async (m, { conn, args, usedPrefix, command, __dirname }) => {
  const timestamp = new Date().toTimeString().split(" ")[0]

  if (!args.length)
    return m.reply(
      `Enter the target file path.\n` +
      `› Example: ${usedPrefix + command} plugins owner owner-delsw\n` +
      `› Example: ${usedPrefix + command} package.json`
    )

  let target = join(...args)
  if (!extname(target)) target += ".js"

  const filepath = join(__dirname, "../", target)
  if (!existsSync(filepath))
    return m.reply(`File not found: ${target}`)

  const fileBuffer = readFileSync(filepath)
  const fileName = target.split("/").pop()
  const fileSize = (fileBuffer.length / 1024).toFixed(2)

  const caption = [
    "```",
    `Time : ${timestamp}`,
    `Path : ${target}`,
    `Name : ${fileName}`,
    `Size : ${fileSize} KB`,
    "───────────────────────────",
    "File successfully sent.",
    "```",
  ].join("\n")

  await conn.sendMessage(
    m.chat,
    {
      document: fileBuffer,
      fileName,
      mimetype: "application/octet-stream",
      caption,
    },
    { quoted: m }
  )
}

handler.help = ["getfile <path>"]
handler.tags = ["owner"]
handler.command = /^(getfile|getplugin|gf)$/i
handler.mods = true

export default handler