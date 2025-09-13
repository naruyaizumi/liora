
let items = [
'money','bank','limit','exp','potion','trash','wood','rock','string','petfood','emerald','diamond','gold','iron',
'common','uncommon','mythic','legendary','pet','chip','anggur','apel','jeruk','mangga','pisang',
'bibitanggur','bibitapel','bibitjeruk','bibitmangga','bibitpisang','umpan','garam','minyak',
'gandum','steak','ayam_goreng','ribs','roti','udang_goreng','bacon'
]

let handler = async (m, { conn, args, usedPrefix, command }) => {
let user = global.db.data.users[m.sender]
let item = items.filter(v => v in user && typeof user[v] == 'number')
let lol = `
🌸 *Gunakan format:*
*${usedPrefix + command} [type] [jumlah] [@tag/nomor]*
🍓 *Contoh:*
*${usedPrefix}${command} diamond 10 @${m.sender.split("@")[0]}*
🧺 *Daftar item yang bisa ditransfer:*
${item.map(v => `*• ${global.rpg.emoticon(v)} ${v}*`).join('\n')}
`.trim()
let type = (args[0] || '').toLowerCase()
if (!item.includes(type)) return conn.reply(m.chat, lol, m, { mentions: [m.sender] })
let count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, (isNumber(args[1]) ? parseInt(args[1]) : 1))) * 1
let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : args[2] ? (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : ''
if (!who) return m.reply('🌸 *Tag salah satu, atau ketik nomornya yaa~*')
if (!(who in global.db.data.users)) return m.reply(`🧸 *User ${who} belum terdaftar~*`)
let _user = global.db.data.users[who]
if (user[type] < count) return m.reply(`🩶 *${type + special(type)} kamu cuma punya ${toRupiah(user[type])}* ${global.rpg.emoticon(type)}`)
user[type] -= count
_user[type] += count
m.reply(`*───『 TRANSFER BERHASIL 』───*
🍓 *Status: Berhasil dikirim~*
🍡 *Tipe Item: ${type + special(type)} ${global.rpg.emoticon(type)}*
🍭 *Jumlah Kirim: ${toRupiah(count)}*
🎀 *Dikirim ke: @${(who || '').replace(/@s\.whatsapp\.net/g, '')}*`, null, { mentions: [who] })
}

handler.help = ['transfer']
handler.tags = ['rpg']
handler.command = /^(transfer|tf)$/i
handler.register = true
handler.group = true
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