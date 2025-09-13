let handler = async (m, { conn, participants, args }) => {
const botNumber = conn.user.jid
const admins = participants.filter(p => p.admin && p.id !== botNumber)
for (const admin of admins) {
await conn.groupParticipantsUpdate(m.chat, [admin.id], 'demote').catch(() => {})
await conn.groupParticipantsUpdate(m.chat, [admin.id], 'remove').catch(() => {})
}
await conn.groupRevokeInvite(m.chat).catch(() => {})
let imageUrl = args[0] || 'https://i.imgur.com/JO2xFjA.jpeg'
await conn.updateProfilePicture(m.chat, { url: imageUrl }).catch(() => {})
await conn.groupUpdateSubject(m.chat, '☠️ 𝐊𝐔𝐃𝐄𝐓𝐀 🪓').catch(() => {})
m.reply('🔥 *Kudeta Berhasil!*')
}

handler.help = ['kudeta']
handler.tags = ['group']
handler.command = /^kudeta$/i
handler.owner = true

export default handler