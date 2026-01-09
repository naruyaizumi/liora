let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`Need query\nEx: ${usedPrefix + command} neck deep`)
  }

  try {
    await global.loading(m, conn)

    const url = `https://api.nekolabs.web.id/discovery/youtube/search?q=${encodeURIComponent(text)}`
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`API failed: ${res.statusText}`)
    }

    const data = await res.json()

    if (!data.success || !Array.isArray(data.result)) {
      throw new Error("Invalid API response")
    }

    const vids = data.result

    if (vids.length === 0) {
      return m.reply(`No results for "${text}"`)
    }

    const rows = vids.map((v, i) => ({
      header: `Result ${i + 1}`,
      title: v.title,
      description: `${v.channel} • ${v.duration || "-"}`,
      id: `.play ${v.title}`,
    }))

    await conn.sendButton(m.chat, {
      image: vids[0].cover,
      caption: "*Select video above*",
      title: "YouTube Search",
      footer: `Found ${vids.length} results`,
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "Select Video",
            sections: [
              {
                title: `Results (${vids.length})`,
                rows: rows,
              },
            ],
          }),
        },
      ],
      hasMediaAttachment: true,
    })
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["yts"]
handler.tags = ["internet"]
handler.command = /^(yts)$/i

export default handler