let handler = async (m, { conn, text }) => {
  try {
    await global.loading(m, conn)

    const inp = 
      m.mentionedJid?.[0] ||
      m.quoted?.sender ||
      (text && /^\d+$/.test(text) ? text + "@s.whatsapp.net" : null)

    if (!inp) throw new Error("Enter number, mention, or reply")

    let lid

    if (/@lid$/.test(inp)) {
      lid = inp.replace(/@lid$/, "")
    } else {
      const r = await conn.signalRepository.lidMapping.getLIDForPN(inp)
      if (!r) throw new Error("Cannot resolve LID")
      lid = r.replace(/@lid$/, "")
    }

    await conn.client(m.chat, {
      text: `Target LID: ${lid}`,
      title: "Result",
      footer: "Use button below to copy",
      interactiveButtons: [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "Copy LID",
            copy_code: lid,
          }),
        },
      ],
      hasMediaAttachment: false,
    })
  } catch (e) {
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ["getlid"]
handler.tags = ["tools"]
handler.command = /^(getlid)$/i

export default handler