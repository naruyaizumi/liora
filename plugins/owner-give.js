const items = [
'money','bank','limit','exp','potion','trash','wood','rock','string','petfood','emerald','diamond','gold','iron',
'common','uncommon','mythic','legendary','pet','chip','anggur','apel','jeruk','mangga','pisang',
'bibitanggur','bibitapel','bibitjeruk','bibitmangga','bibitpisang','umpan','garam','minyak',
'gandum','steak','ayam_goreng','ribs','roti','udang_goreng','bacon'
]

let handler = async (m, { conn, args, usedPrefix, command }) => {
const type = (args[0] || '').toLowerCase()
if (!items.includes(type)) {
return m.reply(`📦 *Item tidak ditemukan!*\n\n🧺 *Item valid:*\n${items.map(v => '• ' + v).join('\n')}`)
}
const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, parseInt(args[1]) || 1))
let who =
(m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0]
: (m.quoted && m.quoted.sender) ? m.quoted.sender
: (args[2] ? (args[2].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : '')
if (!who) return m.reply(`🍡 *Tag/reply user atau tulis nomornya*\n*contoh: ${usedPrefix + command} money 1111 @user*`)
const users = global.db.data.users
if (!(who in users)) {
return m.reply(`❌ *User @${who.replace(/@s\.whatsapp\.net$/,'')} belum terdaftar!*`, null, { mentions: [who] })
}
users[who][type] = (users[who][type] || 0) + count
m.reply(
`*───『 GIVE BERHASIL 』───*
🎁 *Item: ${type + special(type)} ${global.rpg?.emoticon?.(type) || ''}*
🎀 *Jumlah: ${toRupiah(count)}*
📮 *Penerima:* @${who.replace(/@s\.whatsapp\.net$/,'')}`,
null,
{ mentions: [who] }
)
}

handler.help = ['give']
handler.tags = ['rpg']
handler.command = /^(give)$/i
handler.owner = true
handler.rpg = true

export default handler

function special(type) {
const b = type.toLowerCase()
return ['common','uncommon','mythic','legendary','pet'].includes(b) ? ' Crate' : ''
}

function toRupiah(n) {
const num = parseInt(n) || 0
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ',')
}