import { execSync } from "child_process";

let handler = async (m, { conn, args }) => {
  let msg = args.join(" ") || `Liora: 🍧 Sinkronisasi otomatis ~`

  try {
    execSync(`git config user.name "🩷 Liora Bot"`)
    execSync(`git config user.email "liora@bot"`)

    try {
      execSync("git add -A")
      execSync(`git commit -m "${msg}"`, { stdio: "ignore" })
    } catch {
      return m.reply("🍰 *Tidak ada perubahan untuk di-commit* ✨")
    }

    execSync("git push origin main", { stdio: "inherit" })

    let diffStat = execSync("git show --stat --oneline -1", { encoding: "utf-8" })
      .split("\n")
      .filter(line => line)

    let fileChanges = diffStat
      .filter(line => line.includes("|"))
      .map(line => {
        let parts = line.trim().split("|")
        let file = parts[0].trim()
        let stats = parts[1]
          .replace(/insertions?\(\+\)/, "")
          .replace(/deletions?\(-\)/, "")
          .trim()
        let added = (stats.match(/\+/g) || []).length
        let removed = (stats.match(/-/g) || []).length
        return `📄 *${file} +${added} -${removed}*`
      })
      .join("\n")

    let summary = diffStat.find(line => line.includes("changed"))

    await conn.sendMessage(m.chat, {
      text:
        `🍬 *Push ke GitHub sukses!* 🎀\n\n` +
        `📂 *Status Perubahan:*\n${fileChanges || "*(tidak ada perubahan)*"}\n\n` +
        `📊 *Summary:*\n*${summary || "(tidak ada)"}*`,
      contextInfo: {
        externalAdReply: {
          title: "Push Sukses! 🍫",
          body: global.config.author,
          thumbnailUrl: "https://files.cloudkuimages.guru/images/7ad6423e2075.jpg",
          sourceUrl: global.config.website,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })

  } catch (err) {
    await m.reply(`🍫 *Push gagal:*\n\`\`\`${err.message}\`\`\``)
  }
}

handler.help = ["push"]
handler.tags = ["owner"]
handler.command = /^(push)$/i
handler.mods = true

export default handler