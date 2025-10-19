let handler = async (m, { conn, participants }) => {
let whatsappID = '867051314767696@bot'
let tag = `@${whatsappID.split('@')[0]}`
let allMembers = participants.map(p => p.lid)
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