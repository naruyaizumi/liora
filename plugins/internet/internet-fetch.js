import { exec } from "child_process"
import fs from "fs/promises"
import { join } from "path"
import os from "os"
import { fileTypeFromBuffer } from "file-type"

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!/^https?:\/\//i.test(text || ""))
    return m.reply(`Invalid URL format.\n› Example: ${usedPrefix + command} https://example.com/file.jpg`)

  await global.loading(m, conn)

  const tmp = join(os.tmpdir(), `fetch_${Date.now()}.bin`)
  const headersFile = join(os.tmpdir(), `headers_${Date.now()}.txt`)
  const curlCmd = `curl -L --silent --show-error --max-time 45 -D "${headersFile}" -o "${tmp}" "${text}"`

  let stderr = ""
  await new Promise((resolve) => {
    const proc = exec(curlCmd, (err) => resolve(err))
    proc.stderr.on("data", (d) => (stderr += d.toString()))
  })

  const timestamp = new Date().toTimeString().split(" ")[0]
  const headersRaw = await fs.readFile(headersFile, "utf-8").catch(() => "(no headers)")
  const buffer = await fs.readFile(tmp).catch(() => Buffer.alloc(0))
  const stat = await fs.stat(tmp).catch(() => ({ size: 0 }))
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2)

  const type = await fileTypeFromBuffer(buffer).catch(() => null)

  let headerMime = headersRaw.match(/content-type:\s*([^\n\r]+)/i)?.[1]?.trim().toLowerCase() || ""
  headerMime = headerMime.split(";")[0].trim()
  const mime = type?.mime || headerMime || "application/octet-stream"
  const ext = type?.ext || mime.split("/")[1] || "bin"

  const isJson = mime === "application/json"
  const isText = /^text\//.test(mime)
  const isImage = /^image\//.test(mime)
  const isVideo = /^video\//.test(mime)
  const isAudio = /^audio\//.test(mime)

  let caption = [
    "```",
    `┌─[${timestamp}]─────────────`,
    `│  Network Fetch Log`,
    "└────────────────────────────",
    `URL     : ${text}`,
    `Status  : ${stderr ? "ERROR" : "OK"}`,
    `Size    : ${sizeMB} MB`,
    `MIME    : ${mime}`,
    `Output  : result.${ext}`,
    "────────────────────────────",
    "HEADERS (Top 10):",
    headersRaw.split("\n").slice(0, 10).join("\n"),
    "```",
  ].join("\n")

  let msg

  if (isJson || isText) {
    let content = buffer.toString("utf-8")
    if (isJson) {
      try {
        content = JSON.stringify(JSON.parse(content), null, 2)
      } catch {/* ignore */}
    }
    if (content.length > 3000)
      content = content.slice(0, 3000) + "\n\n[ truncated :v ]"
    caption += `\n────────────────────────────\nPreview:\n\`\`\`\n${content}\n\`\`\``

    msg = {
      document: buffer,
      mimetype: mime,
      fileName: `result.${ext}`,
      caption,
    }

    await conn.sendMessage(m.chat, msg, { quoted: m })
  } else if (isImage)
    msg = { image: buffer, caption }
  else if (isVideo)
    msg = { video: buffer, caption }
  else if (isAudio)
    msg = { audio: buffer, mimetype: mime }
  else
    msg = { document: buffer, mimetype: mime, fileName: `result.${ext}`, caption }

  if (!isJson && !isText)
    await conn.sendMessage(m.chat, msg, { quoted: m }).catch(async () => {
      await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
    })

  await fs.unlink(tmp).catch(() => {})
  await fs.unlink(headersFile).catch(() => {})
  await global.loading(m, conn, true)
}

handler.help = ["fetch"]
handler.tags = ["internet"]
handler.command = /^(fetch|curl|get)$/i
handler.owner = true

export default handler