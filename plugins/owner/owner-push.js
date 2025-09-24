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
    let rawLogs = execSync(
      `git log --pretty=format:"%h|%an|%ad|%s" --date=iso`,
      { encoding: "utf-8" }
    ).trim().split("\n")
    let parsedLogs = rawLogs.map(line => {
      let [hash, author, date, message] = line.split("|")
      return [
        `🔖 *Commit: ${hash}*`,
        `👤 *Author: ${author}*`,
        `🕒 *Date: ${date}*`,
        `📝 *Message: ${message}*`
      ].join("\n")
    }).join("\n\n━━━━━━━━━━━━━━━━━━━\n\n")
    let fileStats = execSync("git show --stat --oneline -1", { encoding: "utf-8" })
      .split("\n")
      .filter(line => line.includes("|") && !line.startsWith(" "))
      .map(line => "📄 *" + line.trim())
      .join("*\n")

    let totalStats = execSync("git show --stat --oneline -1", { encoding: "utf-8" })
      .split("\n")
      .find(line => line.includes("changed"))

    await conn.sendMessage(m.chat, {
      text: 
        `🍬 *Push ke GitHub sukses!* 🎀\n\n` +
        `📚 *Commit History:*\n\n${parsedLogs}\n\n` +
        `📂 *File berubah (terakhir):*\n${fileStats || "*(tidak ada perubahan)*"}\n\n` +
        `📊 *Summary:*\n${totalStats || "*(tidak ada)*"}\n`,
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