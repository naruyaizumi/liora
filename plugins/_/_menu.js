import os from "os";
import fs from "fs";

const CATEGORIES = [
  "all", "ai", "downloader", "group", "info",
  "internet", "maker", "owner", "islam", "tools"
];

const MENU_META = {
  ai: "🧠 AI",
  downloader: "🍥 Downloader",
  group: "🧃 Grup",
  info: "📖 Info",
  internet: "💌 Internet",
  maker: "🎀 Maker",
  owner: "🪄 Owner",
  islam: "🍃 Islami",
  tools: "🧸 Tools",
};

let handler = async (m, { conn, usedPrefix, command, isOwner, isMods, args }) => {
  await global.loading(m, conn);

  let name = await conn.getName(m.sender);
  let status = isMods ? "Developer" : isOwner ? "Owner" : "User";

  const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  const version = pkg.version;
  let uptime = formatTime(process.uptime());
  let muptime = formatTime(os.uptime());

  let infoBot = `
🍓 *INFO BOT*
────────────────
🧁 *Bot: ${conn.user.name}*
🍒 *Version: ${version}*
🍧 *Uptime: ${uptime}*
🍮 *Server Uptime: ${muptime}*
────────────────
`.trim();

  if (!args[0]) {
    let list = CATEGORIES.map((v, i) => `*${i + 1}. ${capitalize(v)}*`).join("\n");
    return conn.sendMessage(m.chat, {
      text: `${infoBot}\n${list}\n\n📌 *Contoh: ${usedPrefix + command} 1 atau ${usedPrefix + command} ai*`,
      contextInfo: {
        externalAdReply: {
          title: global.config.author,
          body: "Menu Bot",
          thumbnailUrl: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg",
          sourceUrl: global.config.website,
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    }, { quoted: m });
  }

  let input = args[0].toLowerCase();

  if (!isNaN(input)) {
    let idx = parseInt(input) - 1;
    if (idx >= 0 && idx < CATEGORIES.length) {
      input = CATEGORIES[idx];
    } else {
      return m.reply("🍩 *Nomor kategori tidak valid!*");
    }
  }

  if (!CATEGORIES.includes(input)) {
    return m.reply("🍩 *Kategori tidak valid!*");
  }

  let help = Object.values(global.plugins)
    .filter(p => !p.disabled)
    .map(p => ({
      help: Array.isArray(p.help) ? p.help : [p.help],
      tags: Array.isArray(p.tags) ? p.tags : [p.tags],
      owner: p.owner,
      admin: p.admin,
      mods: p.mods,
    }));

  let selectedTags = input === "all" ? Object.keys(MENU_META) : [input];
  let sections = selectedTags.map(tag => {
    let cmds = help.filter(p => p.tags.includes(tag)).flatMap(p =>
      p.help.map(cmd =>
        `*• ${usedPrefix + cmd}* ${p.admin ? "🅐" : ""}${p.mods ? "🅓" : ""}${p.owner ? "🅞" : ""}`
      )
    );
    return `*${MENU_META[tag]} Menu*\n${cmds.join("\n")}`;
  });

  let output = `
🍓 *INFO USER*
────────────────
🍩 *Nama: ${name}*
🧁 *Status: ${status}*

${sections.join("\n\n")}

*© 2024 – 2025 Naruya Izumi*
`.trim();

  await conn.sendMessage(m.chat, {
    text: output,
    contextInfo: {
      externalAdReply: {
        title: global.config.author,
        body: "🍱 Daftar Command",
        thumbnailUrl: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg",
        sourceUrl: global.config.website,
        mediaType: 1,
        renderLargerThumbnail: true,
      },
    },
  }, { quoted: m });
};

handler.help = ["menu"];
handler.command = /^(menu|help)$/i;

export default handler;

function formatTime(sec) {
  let m = Math.floor(sec / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  m %= 60; h %= 24;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ") || "0m";
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}