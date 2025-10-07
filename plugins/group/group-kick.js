let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
  const targets = []

  if (m.mentionedJid?.length) targets.push(...m.mentionedJid)
  if (m.quoted?.sender) targets.push(m.quoted.sender)

  for (const arg of args) {
    if (/^\d{5,}$/.test(arg))
      targets.push(arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
  }

  const mapped = await Promise.all(
    targets.map(async jid => {
      if (jid.endsWith("@s.whatsapp.net")) {
        const lid = await conn.signalRepository.lidMapping
          .getLIDForPN(jid)
          .catch(() => null)
        return lid || jid
      }
      return jid
    })
  )

  const validTargets = [...new Set(mapped)].filter(
    v => v !== m.sender && participants.some(p => p.id === v)
  )

  if (!validTargets.length)
    return m.reply(
      `Specify members to remove.\n› Example: ${usedPrefix + command} @628xxxx`
    )

  await Promise.allSettled(
    validTargets.map(async target => {
      try {
        await conn.groupParticipantsUpdate(m.chat, [target], "remove")
      } catch (err) {
        console.error(`Remove failed for ${target}:`, err)
      }
      await delay(1500)
    })
  )
}

handler.help = ["kick"]
handler.tags = ["group"]
handler.command = /^(kick|k)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))