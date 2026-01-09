import os from "os"

const CATS = [
  "ai",
  "downloader",
  "group",
  "info",
  "internet",
  "maker",
  "owner",
  "tools",
]

const META = {
  ai: "AI",
  downloader: "Downloader",
  group: "Group",
  info: "Info",
  internet: "Internet",
  maker: "Maker",
  owner: "Owner",
  tools: "Tools",
}

let handler = async (m, { conn, usedPrefix, command, args }) => {
  await global.loading(m, conn)

  try {
    const pkg = await getPkg()
    const help = getHelp()
    const inp = (args[0] || "").toLowerCase()
    const time = new Date().toTimeString().split(" ")[0]

    if (inp === "all") {
      return await all(conn, m, help, usedPrefix, time)
    }

    if (!inp) {
      return await main(conn, m, pkg, usedPrefix, command, time)
    }

    const idx = parseInt(inp) - 1
    const cat = !isNaN(idx) && CATS[idx] ? CATS[idx] : inp

    if (!CATS.includes(cat)) {
      return m.reply(`Invalid category. Use \`${usedPrefix + command}\``)
    }

    return await show(conn, m, help, cat, usedPrefix, time)
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

async function all(conn, m, help, prefix, time) {
  const cmds = CATS.map(c => {
    const list = format(help, c, prefix)
    return list.length > 0 ? `\n${META[c]}\n${list.join("\n")}` : ""
  }).filter(Boolean).join("\n")

  const txt = [
    "```",
    `[${time}] All Commands`,
    "─".repeat(30),
    cmds,
    "```",
  ].join("\n")

  return conn.sendMessage(
    m.chat,
    {
      text: txt,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          title: "All Commands",
          body: "Complete List",
          thumbnailUrl: "https://qu.ax/TLqUB.png",
          sourceUrl: "https://linkbio.co/naruyaizumi",
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: q() },
  )
}

async function main(conn, m, pkg, prefix, cmd, time) {
  const upBot = fmt(process.uptime())
  const upSys = fmt(os.uptime())

  const cap = [
    "```",
    `[${time}] Liora`,
    "─".repeat(30),
    `Name    : ${pkg.name}`,
    `Version : ${pkg.version}`,
    `License : ${pkg.license}`,
    `Type    : ${pkg.type}`,
    `Runtime : Bun ${Bun.version}`,
    `VPS Up  : ${upSys}`,
    `Bot Up  : ${upBot}`,
    "",
    `Owner   : ${pkg.author?.name || "Naruya Izumi"}`,
    `Social  : https://linkbio.co/naruyaizumi`,
    "─".repeat(30),
    "Select category below",
    "```",
  ].join("\n")

  const sections = [
    {
      title: "Categories",
      rows: CATS.map(c => ({
        title: META[c],
        description: `View ${META[c]} commands`,
        id: `${prefix + cmd} ${c}`,
      })),
    },
    {
      title: "Options",
      rows: [
        {
          title: "All Commands",
          description: "View all at once",
          id: `${prefix + cmd} all`,
        },
      ],
    },
  ]

  return await conn.client(
    m.chat,
    {
      product: {
        productImage: { url: "https://files.catbox.moe/1moinz.jpg" },
        productId: "25015941284694382",
        title: "Liora Menu",
        description: "WhatsApp Bot",
        currencyCode: "USD",
        priceAmount1000: "0",
        retailerId: global.config.author,
        url: "https://wa.me/p/25015941284694382/6283143663697",
        productImageCount: 1,
      },
      businessOwnerJid: "113748182302861@lid",
      caption: cap,
      title: "Liora Menu",
      footer: global.config.watermark || "Liora",
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "Select",
            sections,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Script",
            url: "https://github.com/naruyaizumi/liora",
          }),
        },
      ],
      hasMediaAttachment: false,
    },
    { quoted: q() },
  )
}

async function show(conn, m, help, cat, prefix, time) {
  const cmds = format(help, cat, prefix)

  const txt = cmds.length > 0
    ? [
        "```",
        `[${time}] ${META[cat]} Commands`,
        "─".repeat(30),
        cmds.join("\n"),
        "─".repeat(30),
        `Total: ${cmds.length}`,
        "```",
      ].join("\n")
    : `No commands for ${META[cat]}`

  return conn.sendMessage(
    m.chat,
    {
      text: txt,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          title: `${META[cat]} Commands`,
          body: `${cmds.length} commands`,
          thumbnailUrl: "https://qu.ax/TLqUB.png",
          sourceUrl: "https://linkbio.co/naruyaizumi",
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: q() },
  )
}

handler.help = ["menu"]
handler.tags = ["info"]
handler.command = /^(menu|help)$/i

export default handler

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  return (
    [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`]
      .filter(Boolean)
      .join(" ") || "0m"
  )
}

function getPkg() {
  try {
    return Bun.file("./package.json").json()
  } catch {
    return {
      name: "Unknown",
      version: "?",
      type: "?",
      license: "?",
      author: { name: "Unknown" },
    }
  }
}

function getHelp() {
  return Object.values(global.plugins)
    .filter(p => !p.disabled)
    .map(p => ({
      help: [].concat(p.help || []),
      tags: [].concat(p.tags || []),
      owner: p.owner,
      mods: p.mods,
      admin: p.admin,
    }))
}

function format(help, cat, prefix) {
  return help
    .filter(p => p.tags.includes(cat))
    .flatMap(p =>
      p.help.map(cmd => {
        const b = p.mods ? " (dev)" : p.owner ? " (owner)" : p.admin ? " (admin)" : ""
        return `- ${prefix + cmd}${b}`
      }),
    )
}

function q() {
  const v = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`

  return {
    key: {
      fromMe: false,
      participant: "13135550002@s.whatsapp.net",
      remoteJid: "status@broadcast",
    },
    message: {
      contactMessage: {
        displayName: "𝗟 𝗜 𝗢 𝗥 𝗔",
        vcard: v,
      },
    },
  }
}