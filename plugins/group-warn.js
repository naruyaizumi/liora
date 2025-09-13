
let handler = async (m, { conn, args }) => {
let mention = m.mentionedJid && m.mentionedJid[0]
let target = mention || m.sender
let user = global.db.data.users[target]
let name = await conn.getName(target)

await m.reply(`🍮 *Cek Warning!*\n\n👤 *User: ${name}*\n⚠️ *Total Warning: ${user.warning}*\n\n🍬 *Ayo tetap sopan dan jaga suasana grup ya~*`, false, { mentions: [target] })
}

handler.help = ['warning']
handler.tags = ['group']
handler.command = /^(warn|warning)$/i
handler.group = true
handler.register = true

export default handler