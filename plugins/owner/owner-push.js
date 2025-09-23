import { execSync } from "child_process"

let handler = async (m, { conn, args }) => {
  let msg = args.join(" ") || `AUTO PUSH: 🍧 Sinkronisasi otomatis ~ Liora`

  try {
    execSync(`git config user.name "🩷 Liora Bot"`)
    execSync(`git config user.email "liora@bot"`)

    // 🟢 auto save dulu biar gak ada unstaged changes
    try {
      execSync("git add -A")
      execSync(`git commit -m "AUTO SAVE: sebelum pull"`, { stdio: "ignore" })
    } catch {
      // kalau gak ada yang berubah, biarin aja
    }

    // 🟢 pull dari remote
    let pullOutput = ""
    try {
      pullOutput = execSync("git pull --rebase origin main", { encoding: "utf-8" })
    } catch (e) {
      return m.reply(
        `🍫 *Gagal melakukan pull dari GitHub (mungkin ada conflict):*\n\`\`\`${e.message}\`\`\`\n\n` +
        `⚠️ Silakan resolve conflict manual sebelum push lagi.`
      )
    }

    // kasih info kalau ada update dari remote
    if (!/Already up to date|Sudah paling baru/i.test(pullOutput)) {
      let changedFiles = execSync("git diff --name-only HEAD@{1} HEAD", { encoding: "utf-8" })
        .trim()
        .split("\n")
        .filter(Boolean)

      let commitLogs = execSync("git log HEAD@{1}..HEAD --oneline -n 5", { encoding: "utf-8" })
        .trim()

      await conn.sendMessage(m.chat, {
        text:
          `🍓 *Ada update baru dari GitHub!*\n\n` +
          `📂 *File berubah:*\n${changedFiles.map(f => "*- " + f).join("*\n") || "*(tidak ada)*"}\n\n` +
          `📝 *Commit:*\n*${commitLogs || "(tidak ada)"}*`
      }, { quoted: m })
    }

    try {
      execSync("git add -A")
      execSync(`git commit -m "${msg}"`)
    } catch {
      return m.reply("🍰 *Tidak ada perubahan lokal untuk di-commit* ✨")
    }
    
    execSync("git push origin main", { stdio: "inherit" })

    await conn.sendMessage(m.chat, {
      text: `🍬 *Push ke GitHub sukses!* 🎀\n🩷 *Commit: ${msg}*`,
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