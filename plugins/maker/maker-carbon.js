import { fetch } from "../../src/bridge.js"

let handler = async (m, { conn, usedPrefix, command, args }) => {
  try {
    await global.loading(m, conn)

    if (!args.length)
      return m.reply(
        `Enter the code to convert into an image.\n› Example: ${usedPrefix + command} console.log("Hello World!")`
      )

    const code = args.join(" ")
    const apiUrl = global.API("btz", "/api/maker/carbon", { text: code }, "apikey")
    const response = await fetch(apiUrl)

    if (!response.ok)
      return m.reply(`Failed to generate code image. (HTTP ${response.status})`)

    const json = await response.json()
    if (!json.status || !json.result)
      return m.reply("No valid image result received from API.")

    await conn.sendMessage(
      m.chat,
      { image: { url: json.result } },
      { quoted: m }
    )
  } catch (e) {
    console.error(e)
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["carbon"]
handler.tags = ["tools"]
handler.command = /^(carbon|code2img)$/i

export default handler