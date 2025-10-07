import { uploader } from "../../lib/uploader.js"
import { fetch } from "../../src/bridge.js" 

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ""
    let resultText = ""
    let prompt = text || ""

    if (!prompt && !mime) {
      return conn.sendMessage(
        m.chat,
        {
          text: [
            "```",
            "┌─[GEMINI AI HELP]────────────",
            "│  Available modes:",
            "│  1. Text   : " + `${usedPrefix + command} What is relativity?`,
            "│  2. Audio  : reply to an audio with " + `${usedPrefix + command} Transcribe this audio`,
            "│  3. Image  : reply to an image with " + `${usedPrefix + command} Describe this image`,
            "│  4. Video  : reply to a video with " + `${usedPrefix + command} Analyze this video`,
            "└─────────────────────────────",
            "```",
          ].join("\n"),
          contextInfo: {
            externalAdReply: {
              title: "Gemini AI",
              body: "Powered by Google AI",
              thumbnailUrl: "https://qu.ax/qqiCx.jpg",
              sourceUrl: "https://gemini.google.com",
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        },
        { quoted: m },
      )
    }

    await global.loading(m, conn)

    const safeString = (val) => {
      if (typeof val === "string") return val
      try {
        return JSON.stringify(val, null, 2)
      } catch {
        return String(val)
      }
    }

    if (mime.includes("audio")) {
      let media = await q.download().catch(() => null)
      if (!media) return m.reply("Failed to download audio.")
      let linkUpload = await uploader(media).catch(() => null)
      if (!linkUpload) return m.reply("Failed to upload audio.")
      let inputText = prompt || "Please transcribe this audio."
      let apiUrl = global.API("btz", "/api/search/bard-audio", { url: linkUpload, text: inputText }, "apikey")
      let response = await fetch(apiUrl)
      if (!response.ok) return m.reply("Audio processing failed.")
      let json = await response.json()
      resultText = safeString(json?.result || "No recognizable result found.")
      prompt = inputText

    } else if (mime.includes("image")) {
      let media = await q.download().catch(() => null)
      if (!media) return m.reply("Failed to download image.")
      let linkUpload = await uploader(media).catch(() => null)
      if (!linkUpload) return m.reply("Failed to upload image.")
      if (!prompt) return m.reply(`Usage: ${usedPrefix + command} Describe this image`)
      let apiUrl = global.API("btz", "/api/search/bard-img", { url: linkUpload, text: prompt }, "apikey")
      let response = await fetch(apiUrl)
      if (!response.ok) return m.reply("Image analysis failed.")
      let json = await response.json()
      resultText = safeString(json?.result || "Gemini could not interpret this image.")

    } else if (mime.includes("video")) {
      let media = await q.download().catch(() => null)
      if (!media) return m.reply("Failed to download video.")
      let linkUpload = await uploader(media).catch(() => null)
      if (!linkUpload) return m.reply("Failed to upload video.")
      if (!prompt) return m.reply(`Usage: ${usedPrefix + command} Analyze this video`)
      let apiUrl = global.API("btz", "/api/search/bard-video", { url: linkUpload, text: prompt }, "apikey")
      let response = await fetch(apiUrl)
      if (!response.ok) return m.reply("Video analysis failed.")
      let json = await response.json()
      resultText = safeString(json?.result || "Gemini could not interpret this video.")

    } else {
      let apiUrl = global.API("btz", "/api/search/bard-ai", { text: prompt }, "apikey")
      let response = await fetch(apiUrl)
      if (!response.ok) return m.reply("Gemini connection failed.")
      let json = await response.json()
      resultText = safeString(json?.message || "No response from Gemini.")
    }

    const timestamp = new Date().toTimeString().split(" ")[0]
    const output = [
      "```",
      `┌─[${timestamp}]────────────`,
      `│  GEMINI AI RESPONSE`,
      "└──────────────────────",
      `> Query: ${prompt}`,
      "───────────────────────",
      resultText.trim(),
      "───────────────────────",
      "```",
    ].join("\n")

    await conn.sendMessage(m.chat, { text: output }, { quoted: m })
  } catch (e) {
    console.error(e)
    m.reply("Error: " + e.message)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["gemini"]
handler.tags = ["ai"]
handler.command = /^(gemini)$/i

export default handler