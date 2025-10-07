import { readFile } from "fs/promises"
import os from "os"

const CATEGORIES = ["ai", "downloader", "group", "info", "internet", "maker", "owner", "tools"]

const MENU_META = {
  ai: "AI",
  downloader: "Downloader",
  group: "Group",
  info: "Information",
  internet: "Internet",
  maker: "Maker",
  owner: "Owner",
  tools: "Tools",
}

let handler = async (m, { conn, usedPrefix, command, args }) => {
  let pkg
  try {
    const data = await readFile("./package.json", "utf8")
    pkg = JSON.parse(data)
  } catch {
    pkg = { name: "Unknown", version: "?", type: "?", license: "?", author: { name: "Unknown" } }
  }

  const now = new Date()
  const timestamp = now.toTimeString().split(" ")[0]
  const uptimeBot = formatTime(process.uptime())
  const uptimeSys = formatTime(os.uptime())

  const help = Object.values(global.plugins)
    .filter((p) => !p.disabled)
    .map((p) => ({
      help: [].concat(p.help || []),
      tags: [].concat(p.tags || []),
      owner: p.owner,
      admin: p.admin,
    }))

  const input = (args[0] || "").toLowerCase()

  if (!input) {
    const list = CATEGORIES.map((v, i) => `${String(i + 1).padStart(2, "0")}. ${MENU_META[v]}`).join("\n")

    const text = [
      "```",
      `[${timestamp}] Liora Environment`,
      "────────────────────────────",
      `Name       : ${pkg.name}`,
      `Version    : ${pkg.version}`,
      `License    : ${pkg.license}`,
      `Type       : ${pkg.type}`,
      `NodeJS     : ${process.version}`,
      `VPS Uptime : ${uptimeSys}`,
      `Bot Uptime : ${uptimeBot}`,
      "",
      `Owner      : ${pkg.author?.name || "Naruya Izumi"}`,
      `GitHub     : https://github.com/naruyaizumi`,
      `Social     : https://linkbio.co/naruyaizumi`,
      "────────────────────────────",
      "Liora Menu:",
      list,
      "",
      `› Example: ${usedPrefix + command} ai`,
      "```",
    ].join("\n")

    return conn.sendMessage(
      m.chat,
      {
        text,
        contextInfo: {
          externalAdReply: {
            title: "Liora Menu",
            body: global.config.watermark,
            thumbnailUrl: "https://qu.ax/nvlGQ.jpg",
            sourceUrl: global.config.website,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      },
      { quoted: m }
    )
  }

  const idx = parseInt(input) - 1
  const category = !isNaN(idx) && CATEGORIES[idx] ? CATEGORIES[idx] : input
  if (!CATEGORIES.includes(category)) return m.reply("Invalid category.")

  const cmds = help
    .filter((p) => p.tags.includes(category))
    .flatMap((p) =>
      p.help.map((cmd) => `- ${usedPrefix + cmd}${p.owner ? " (owner)" : p.admin ? " (admin)" : ""}`)
    )

  const text =
    cmds.length > 0
      ? [
          "```",
          `[${timestamp}] ${MENU_META[category]} Commands`,
          "────────────────────────────",
          cmds.join("\n"),
          "```",
        ].join("\n")
      : `No commands found for ${MENU_META[category]} category.`

  return conn.sendMessage(
    m.chat,
    {
      text,
      contextInfo: {
        externalAdReply: {
          title: MENU_META[category],
          body: "Command List",
          thumbnailUrl: "https://qu.ax/nvlGQ.jpg",
          sourceUrl: global.config.website,
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: m }
  )
}

handler.help = ["menu"]
handler.command = /^(menu|help)$/i

export default handler

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  return [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`].filter(Boolean).join(" ") || "0m"
}