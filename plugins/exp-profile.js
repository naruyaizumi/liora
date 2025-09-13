let handler = async (m, { conn }) => {
try {
await global.loading(m, conn)
let now = new Date(Date.now() + 3600000)
let week = now.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' })
let date = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
let wib = now.toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })
let who = m.mentionedJid && m.mentionedJid.length
  ? m.mentionedJid[0]
  : m.fromMe ? conn.user.jid : m.sender
let user = global.db.data.users[who]
if (!user) return m.reply('💔 *Pengguna tidak ditemukan di database~*')
let isMods = [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([num, _, dev]) => num && dev).map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(who)
let isOwner = m.fromMe || isMods || [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([num]) => num).map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(who)
let isPrems = isOwner || new Date() - user.premiumTime < 0
let pp = await conn.profilePictureUrl(who, 'image').catch(_ => 'https://cloudkuimages.guru/uploads/images/wTGHCxNj.jpg')
let bio = await conn.fetchStatus(who).catch(_ => ({ status: 'Tidak Ada Bio' }))
let name = user.registered ? user.name : await conn.getName(who)
let datePacaran = user.pacar ? dateTime(user.pacaranTime) : null
let caption = `
🌸 *P R O F I L E   U S E R* 🌸
──────────────────────
🧚‍♀️ *Nama: ${name}*
🎀 *Umur: ${user.registered ? user.age : 'Belum diatur'}*
👑 *Status: ${isMods ? '✨ Developer' : isOwner ? '👑 Owner' : isPrems ? '💎 Premium' : user.level > 999 ? '🔥 Elite' : '👤 Free User'}*
📝 *Bio: ${bio.status || 'Tidak Ada Bio'}*
💞 *Pacar: ${user.pacar ? `❤️ @${user.pacar.split('@')[0]} (${datePacaran})` : '💔 Tidak punya'}*
🔗 *Link WA: wa.me/${who.split('@')[0]}*
──────────────────────
🍡 *R P G   I N F O* 🍡
──────────────────────
🗡️ *Level: ${toRupiah(user.level)}*
🎭 *Role: ${user.role}*
✨ *Exp: ${toRupiah(user.exp)}*
🍰 *Uang: ${toRupiah(user.money)}*
🏦 *Bank: ${toRupiah(user.bank || 0)}*
📜 *Terdaftar: ${user.registered ? 'Ya (Sejak ' + dateTime(user.regTime) + ')' : 'Belum'}*
`.trim()
await conn.sendFile(m.chat, pp, 'pp.jpg', caption, m, false, {
contextInfo: {
mentionedJid: [who, user.pacar].filter(Boolean)
}
})
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['profile']
handler.tags = ['xp']
handler.command = /^(profile|profil)$/i
handler.register = true

export default handler

function dateTime(ts) {
let d = new Date(ts)
return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
}

const toRupiah = n => parseInt(n || 0).toLocaleString('id-ID')