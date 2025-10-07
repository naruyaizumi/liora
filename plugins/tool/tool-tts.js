import { fetch } from "../../src/bridge.js"

const languages = {
  1: ["id-ID", "🇮🇩 Indonesia"],
  2: ["en-US", "🇺🇸 English"],
  3: ["ja-JP", "🇯🇵 Japanese"],
  4: ["fr-FR", "🇫🇷 French"],
  5: ["fil-PH", "🇵🇭 Filipino"],
  6: ["my-MM", "🇲🇲 Burmese"],
  7: ["de-DE", "🇩🇪 German"],
  8: ["it-IT", "🇮🇹 Italian"],
  9: ["ko-KR", "🇰🇷 Korean"],
  10: ["th-TH", "🇹🇭 Thai"],
  11: ["hi-IN", "🇮🇳 Hindi"],
  12: ["ru-RU", "🇷🇺 Russian"],
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    const list = Object.entries(languages)
      .map(([num, [code, name]]) => `${num}. ${name} (${code})`)
      .join("\n")
    return m.reply(
      `Select TTS language by number + text.\n› Example: ${usedPrefix + command} 1 Halo Izumi\n\nAvailable languages:\n${list}`
    )
  }

  const num = parseInt(args[0])
  if (!languages[num]) return m.reply("Invalid language number.")

  const [langCode] = languages[num]
  const text = args.slice(1).join(" ")
  if (!text) return m.reply("Enter text to convert into speech.")

  await global.loading(m, conn)
  try {
    const apiUrl = global.API(
      "btz",
      "/api/sound/texttosound",
      { text1: text, lang: langCode },
      "apikey"
    )

    const res = await fetch(apiUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const fileUrl = json.result || json.url
    if (!fileUrl) throw new Error("No audio file returned from API.")

    await conn.sendFile(m.chat, fileUrl, "tts.mp3", null, m, true)
  } catch (e) {
    console.error(e)
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["tts"]
handler.tags = ["tools"]
handler.command = /^(tts)$/i

export default handler