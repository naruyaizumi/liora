
let handler = async (m, { conn, participants }) => {
let whatsappID = '12066409886@s.whatsapp.net'
let tag = `@${whatsappID.split('@')[0]}`
let allMembers = participants.map(p => p.id)
await conn.sendMessage(m.chat, {
text: tag,
mentions: [whatsappID, ...allMembers]
}, { quoted: m })
}

handler.help = ['everyone']
handler.tags = ['group']
handler.command = /^\.?everyone$/i
handler.group = true
handler.admin = true

export default handler