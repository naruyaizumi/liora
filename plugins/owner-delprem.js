
let handler = async (m, { usedPrefix, command, text }) => {
let who = m.mentionedJid?.[0]
|| m.quoted?.sender
|| (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false)
if (!who) return m.reply(
`🍓 *Tag atau masukkan nomornya dulu ya sayang~*

*Contoh: ${usedPrefix + command} @${m.sender.split`@`[0]}*`)
let user = global.db.data.users[who]
if (!user || !user.premium) return m.reply(`⚠️ *User ini tidak memiliki status premium aktif!*`)
user.premium = false
user.premiumTime = 0
await m.reply(
`💔 *Status Premium ${user.name} telah dicabut~*
*Semoga bisa join premium lagi nanti yaa...*`,
false,
{ mentions: [who] }
)
let capChannel = `
💔 *PREMIUM DIHAPUS* 💔
────────────────────────
🍓 *Nama: ${user.name}*
📱 *Nomor: wa.me/${who.split('@')[0]}*
🗑️ *Status: Premium telah dicabut*
────────────────────────
`.trim()
await conn.sendMessage('120363335665264747@newsletter', { text: capChannel })
}

handler.help = ['delprem']
handler.tags = ['owner']
handler.command = /^(-|del)p(rem)?$/i
handler.owner = true

export default handler