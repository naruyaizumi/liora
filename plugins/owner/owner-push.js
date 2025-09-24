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
    let lastCommit = execSync(
      `git log -1 --pretty=format:"🔖 *Commit: %h*\n👤 *Author: %an*\n🕒 *Date: %ad*\n📝 *Message: %s" --date=iso*`,
      { encoding: "utf-8" }
    )
    
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
        `${lastCommit}\n\n` +
        `📂 *File berubah:*\n${fileStats || "(tidak ada perubahan)"}\n\n` +
        `📊 *Summary:*\n${totalStats || "(tidak ada)"}\n`,
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