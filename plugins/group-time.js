
let handler = async (m, { conn, args, usedPrefix, command, isBotAdmin }) => {
let isClose = {
'open': 'not_announcement',
'buka': 'not_announcement',
'on': 'not_announcement',
'1': 'not_announcement',
'close': 'announcement',
'tutup': 'announcement',
'off': 'announcement',
'0': 'announcement',
}[(args[0] || '').toLowerCase()]

if (!isClose) {
let caption = `
🍩 *Format salah sayang~ Contoh:*
*${usedPrefix + command} tutup*
*${usedPrefix + command} buka*

🍬 *Dengan waktu otomatis (opsional):*
*${usedPrefix + command} tutup 1 (Grup akan dibuka lagi dalam 1 jam)*
*${usedPrefix + command} buka 0.5 (Grup akan ditutup lagi dalam 30 menit)*
`.trim()
return m.reply(caption)
}
let durationMs = args[1] && !isNaN(args[1]) ? (86400000 * parseFloat(args[1]) / 24) : null
let now = new Date()
await conn.groupSettingUpdate(m.chat, isClose)
await conn.sendMessage(m.chat, {
text: `🍰 *Grup berhasil di-${isClose == 'announcement' ? 'tutup' : 'buka'}!*\n${durationMs ? `⏳ Akan otomatis di-${isClose == 'announcement' ? 'buka' : 'tutup'} lagi pada:\n🕒 ${new Date(now.getTime() + durationMs).toLocaleString('id-ID')}` : ''}`,
mentions: [m.sender]
}, { quoted: m })
if (durationMs) {
setTimeout(async () => {
let newStatus = isClose == 'announcement' ? 'not_announcement' : 'announcement'
await conn.groupSettingUpdate(m.chat, newStatus)
await conn.sendMessage(m.chat, {
text: `🎀 *Waktu habis~*\n🍡 *Grup kini telah di-${newStatus == 'announcement' ? 'tutup' : 'buka'} kembali!*\n🕒 *Sekarang: ${new Date().toLocaleString('id-ID')}*`,
mentions: [m.sender]
})
}, durationMs)
}
}

handler.help = ['grouptime']
handler.tags = ['group']
handler.command = /^(grouptime|gctime)$/i
handler.botAdmin = true
handler.admin = true
handler.group = true

export default handler

function clockString(ms) {
let h = Math.floor(ms / 3600000)
let m = Math.floor(ms / 60000) % 60
let s = Math.floor(ms / 1000) % 60
return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}