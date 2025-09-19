let handler = async (m, { conn, text, usedPrefix, command, participants }) => {
let targets = []
if (m.mentionedJid.length) targets.push(...m.mentionedJid)
if (m.quoted && m.quoted.sender) targets.push(m.quoted.sender)
if (text) {
for (let num of text.split(/\s+/)) {
if (/^\d{5,}$/.test(num)) {
let jid = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
targets.push(jid)
}
}
}
targets = [...new Set(targets)].filter(v => participants.some(p => p.id === v))
if (!targets.length)
return m.reply(`🍰 *Tag, reply, atau masukkan nomor pengguna yang ingin diturunkan dari admin ya sayang~*\n\n*Contoh: ${usedPrefix + command} @user*`)
try {
await conn.groupParticipantsUpdate(m.chat, targets, 'demote')
} catch {
m.reply('🍬 *Terjadi kesalahan, pastikan nomor valid dan bot adalah admin.*')
}
}

handler.help = ['demote']
handler.tags = ['group']
handler.command = /^(demote)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler