import {
  uploader,
  uploader2,
  uploader3,
  uploader4,
  uploader5,
  uploader6,
  uploader7,
  uploader8,
} from "../../lib/uploader.js"

const uploaders = {
  1: { name: "Catbox.moe", fn: uploader },
  2: { name: "Uguu.se", fn: uploader2 },
  3: { name: "Qu.ax", fn: uploader3 },
  4: { name: "Put.icu", fn: uploader4 },
  5: { name: "Tmpfiles.org", fn: uploader5 },
  6: { name: "Betabotz", fn: uploader6 },
  7: { name: "Yupra CDN", fn: uploader7 },
  8: { name: "CloudkuImages", fn: uploader8 },
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args[0] || isNaN(args[0]) || !uploaders[args[0]]) {
      const list = Object.entries(uploaders)
        .map(([num, { name }]) => `${num}. ${name}`)
        .join("\n")
      return m.reply(
        `Select upload server by number.\n› Example: ${usedPrefix + command} 1\n\nAvailable servers:\n${list}`,
      )
    }

    const server = uploaders[args[0]]
    const q = m.quoted ? m.quoted : m
    const msg = q.msg || q
    const mime = msg.mimetype || ""
    if (!mime) return m.reply(`Reply to a media message to upload.`)

    await global.loading(m, conn)
    const buffer = await q.download?.().catch(() => null)
    if (!buffer || !buffer.length) return m.reply(`Failed to download the media.`)

    const url = await server.fn(buffer).catch(() => null)
    if (!url) return m.reply(`Upload failed on ${server.name}. Try another server.`)

    const timestamp = new Date().toTimeString().split(" ")[0]
    const response = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  File Uploaded Successfully`,
      "└──────────────────────",
      `Server   : ${server.name}`,
      `Status   : OK`,
      `Size     : ${(buffer.length / 1024).toFixed(2)} KB`,
      `Output   : ${url}`,
      "───────────────────────",
      "Upload completed successfully.",
      "```",
    ].join("\n")

    await conn.sendMessage(m.chat, { text: response }, { quoted: m })
  } catch (e) {
    console.error(e)
    const timestamp = new Date().toTimeString().split(" ")[0]
    const errMsg = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  Upload Error`,
      "└──────────────────────",
      `! ${e.message}`,
      "───────────────────────",
      "Upload failed.",
      "```",
    ].join("\n")
    await conn.sendMessage(m.chat, { text: errMsg }, { quoted: m })
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["upload"]
handler.tags = ["tools"]
handler.command = /^(tourl|url)$/i

export default handler