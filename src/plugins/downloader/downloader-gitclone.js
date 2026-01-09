let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text || !/^https:\/\/github\.com\/[\w-]+\/[\w-]+/i.test(text)) {
      return m.reply(`Need GitHub repo URL\nEx: ${usedPrefix + command} https://github.com/user/repo`)
    }

    const parts = text.split("/")
    if (parts.length < 5) throw new Error("Invalid GitHub URL")

    await global.loading(m, conn)

    const user = parts[3]
    const repo = parts[4]
    const url = `https://api.github.com/repos/${user}/${repo}/zipball`
    const file = `${repo}.zip`

    await conn.sendMessage(
      m.chat,
      {
        document: { url },
        fileName: file,
        mimetype: "application/zip",
      },
      { quoted: m },
    )
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["gitclone"]
handler.tags = ["downloader"]
handler.command = /^(gitclone)$/i

export default handler