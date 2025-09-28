let handler = async (m, { conn, args, participants, command, usedPrefix }) => {
  let targets = []

  // kalau ada tag
  if (m.mentionedJid.length) targets.push(...m.mentionedJid)

  // kalau input manual nomor
  for (let arg of args) {
    if (/^\d{5,}$/.test(arg)) {
      let jid = arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      targets.push(jid)
    }
  }

  // normalisasi & filter
  targets = [...new Set(targets)].filter(
    v => v !== m.sender && participants.some(p => p.id === v || p.lid === v)
  )

  if (!targets.length) {
    return m.reply(
      `🍩 *Tag atau masukkan nomor anggota yang ingin dikeluarkan ya sayang~*\n*Contoh:* ${usedPrefix + command} @628xx`
    )
  }

  for (let target of targets) {
    await conn.groupParticipantsUpdate(m.chat, [target], "remove")
    if (/^dor$/i.test(command)) {
      await m.reply(
        `🔫 *DORRR!!! 🍬 Target @${target.split("@")[0]} berhasil dikeluarkan~*`,
        null,
        { mentions: [target] }
      )
    }
  }
}

handler.help = ["kick"]
handler.tags = ["group"]
handler.command = /^(kick|k|dor)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler