let handler = async (m, { conn }) => {
let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
let user = global.db.data.users[who]
if (!user) return m.reply(`*User ${who} tidak ditemukan dalam database*`)
let isMods = global.config.owner.filter(([n, _, dev]) => n && dev).map(([n]) => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(who)
let isOwner = m.fromMe || isMods || [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([n, _, dev]) => n && !dev).map(([n]) => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net')].includes(who)
let isPrems = isOwner || new Date() - user.premiumTime < 0
let caption = `
🍓 *Info Bank Kamu~!* 🍓
────────────────────────────
🍬 *Nama: ${user.registered ? user.name : conn.getName(m.sender)}*
🍰 *Status: ${isMods ? '🍮 Developer' : isOwner ? '🍫 Owner' : isPrems ? '🍭 Premium' : user.level > 999 ? '🍡 Elite' : '🍪 Free'}*
🧁 *Terdaftar: ${user.registered ? 'Ya' : 'Tidak'}*
🥤 *ATM: ${user.atm > 0 ? 'Level ' + toRupiah(user.atm) : 'Belum punya~'}*
🍮 *Bank: Rp ${toRupiah(user.bank)} / Rp ${toRupiah(user.fullatm)}*
🍬 *Uang: Rp ${toRupiah(user.money)}*
🍩 *Chip: Rp ${toRupiah(user.chip)}*
🍪 *Robo: ${user.robo > 0 ? 'Level ' + user.robo : 'Nggak ada~'}*
────────────────────────────
`.trim()
await conn.sendMessage(m.chat, {
text: caption
}, { quoted: m })
}

handler.help = ['bank']
handler.tags = ['rpg']
handler.command = /^(bank)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}