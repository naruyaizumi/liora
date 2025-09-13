
let handler = async (m) => {
let who
if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
else who = m.sender
const user = global.db.data.users[who]
if (typeof user == 'undefined') return m.reply('⚠️ *Pengguna tidak ditemukan di database!*')
const isMods = [conn.decodeJid(global.conn.user.id), ...global.config.owner.filter(([number, _, isDeveloper]) => number && isDeveloper).map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(who)
const isOwner = m.fromMe || isMods || [conn.decodeJid(global.conn.user.id), ...global.config.owner.filter(([number, _, isDeveloper]) => number && !isDeveloper).map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(who)
const isPrems = isOwner || new Date() - user.premiumTime < 0
m.reply(`
*・゜・🍓 LIMIT USER 🍓・゜・*
────────────────────
🍬 *Nama: ${user.registered ? user.name : conn.getName(who)}*
🧁 *Status: ${isMods ? '🌸 Developer' : isOwner ? '👑 Owner' : isPrems ? '💖 Premium' : user.level > 999 ? '🌟 Elite User' : '🍭 Free User'}*
🍩 *Limit: ${isPrems ? 'Unlimited' : user.limit + ' / 1000'}*
🍡 *Command: ${isPrems ? 'Unlimited' : (user.commandLimit - user.command) + ' / ' + user.commandLimit}*
🍰 *Total Digunakan: ${user.command + user.commandTotal}*
────────────────────
✨ *Gunakan limitmu dengan bijak yaa~*
`.trim())
}

handler.help = ['limit']
handler.tags = ['xp']
handler.command = /^(limit)$/i
handler.register = true

export default handler