
let items = [
'money','bank','limit','exp','potion','trash','wood','rock','string','petfood','emerald','diamond','gold','iron',
'common','uncommon','mythic','legendary','pet','chip','anggur','apel','jeruk','mangga','pisang',
'bibitanggur','bibitapel','bibitjeruk','bibitmangga','bibitpisang','umpan','garam','minyak',
'gandum','steak','ayam_goreng','ribs','roti','udang_goreng','bacon'
]

let handler = async (m, { conn, args, usedPrefix, command }) => {
let user = global.db.data.users
let type = (args[0] || '').toLowerCase()
if (!items.includes(type)) return m.reply(`📦 *Item tidak ditemukan!*\n\n🧺 *Item valid:*\n${items.map(v => '• ' + v).join('\n')}`)
let count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, (isNumber(args[1]) ? parseInt(args[1]) : 1))) * 1
let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : args[2] ? (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : ''
if (!who) return m.reply('🌸 *Tag salah satu user atau masukkan nomornya yaa~*')
if (!(who in user)) return m.reply(`❌ *User ${who} belum terdaftar!*`)
if ((user[who][type] || 0) < count) return m.reply(`🚫 *User tidak memiliki cukup ${type} untuk dikurangi!*`)
user[who][type] -= count
m.reply(`*───『 REMOVE ITEM 』───*
🗑️ *Item: ${type + special(type)} ${global.rpg.emoticon(type)}*
📉 *Jumlah Dikurangi: ${toRupiah(count)}*
👤 *Dari: @${(who || '').replace(/@s\.whatsapp\.net/g, '')}*`, null, { mentions: [who] })
}

handler.help = ['remove']
handler.tags = ['rpg']
handler.command = /^(remove)$/i
handler.owner = true
handler.rpg = true

export default handler

function special(type) {
let b = type.toLowerCase()
return ['common','uncommon','mythic','legendary','pet'].includes(b) ? ' Crate' : ''
}

function isNumber(x) {
let num = parseInt(x)
return typeof num === 'number' && isFinite(num)
}

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}