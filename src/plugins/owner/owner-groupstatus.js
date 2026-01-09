let handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m
  const type = q.mtype || ""
  const mime = (q.msg || q).mimetype || ""

  const txt = m.text || ""
  const cap = txt
    .replace(new RegExp(`^[.!#/](${command})\\s*`, "i"), "")
    .trim()

  try {
    if (!type && !cap) {
      return m.reply(`Reply to media or provide text\nEx: ${usedPrefix + command} Hello or ${usedPrefix + command} reply`)
    }

    await global.loading(m, conn)

    let c = {}

    if (type === "imageMessage" || /image/.test(mime)) {
      const d = await q.download()
      if (!d) throw new Error("Failed to download image")

      const buf = Buffer.from(d.buffer, d.byteOffset, d.byteLength)

      c = {
        image: buf,
        caption: cap || "",
      }
    } else if (type === "videoMessage" || /video/.test(mime)) {
      const d = await q.download()
      if (!d) throw new Error("Failed to download video")

      const buf = Buffer.from(d.buffer, d.byteOffset, d.byteLength)

      c = {
        video: buf,
        caption: cap || "",
      }
    } else if (
      type === "audioMessage" ||
      type === "ptt" ||
      /audio/.test(mime)
    ) {
      const d = await q.download()
      if (!d) throw new Error("Failed to download audio")

      const buf = Buffer.from(d.buffer, d.byteOffset, d.byteLength)

      c = {
        audio: buf,
        mimetype: "audio/mp4",
      }
    } else if (cap) {
      c = {
        text: cap,
      }
    } else {
      throw new Error("Reply to media or provide text")
    }

    const { generateWAMessageContent, generateWAMessageFromContent } =
      await import("baileys")

    const { backgroundColor, ...cNoBg } = c

    const inside = await generateWAMessageContent(cNoBg, {
      upload: conn.waUploadToServer,
      backgroundColor: backgroundColor || undefined,
    })

    const secret = new Uint8Array(32)
    crypto.getRandomValues(secret)

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        messageContextInfo: {
          messageSecret: secret,
        },
        groupStatusMessageV2: {
          message: {
            ...inside,
            messageContextInfo: {
              messageSecret: secret,
            },
          },
        },
      },
      {
        userJid: conn.user.id,
        quoted: m,
      },
    )

    await conn.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id,
    })

    m.reply("Group status sent")
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["groupstatus"]
handler.tags = ["owner"]
handler.command = /^(statusgc|swgc)$/i
handler.owner = true
handler.group = true

export default handler