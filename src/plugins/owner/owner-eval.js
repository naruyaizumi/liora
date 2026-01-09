let handler = async (m, { conn, noPrefix, isOwner }) => {
  if (!isOwner) return
  let t = noPrefix
  let r

  try {
    if (m.text.startsWith("=>")) {
      r = await eval(`(async () => { return ${t} })()`)
    } else {
      r = await eval(`(async () => { ${t} })()`)
    }
  } catch (e) {
    r = e
  }

  let out
  if (
    Array.isArray(r) &&
    r.every(
      (i) => i && typeof i === "object" && !Array.isArray(i),
    )
  ) {
    out = Bun.inspect(r, { depth: null, maxArrayLength: null })
  } else if (typeof r === "string") {
    out = r
  } else {
    out = Bun.inspect(r, { depth: null, maxArrayLength: null })
  }

  await conn.sendMessage(m.chat, { text: out })
}

handler.help = [">", "=>"]
handler.tags = ["owner"]
handler.customPrefix = /^=?> /
handler.command = /(?:)/i

export default handler