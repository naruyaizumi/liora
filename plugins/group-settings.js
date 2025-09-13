
let handler = async (m, { conn, args, usedPrefix, command }) => {
let isClose = {
'open': 'not_announcement',
'close': 'announcement',
}[(args[0] || '').toLowerCase()]
if (isClose === undefined)
return m.reply(`🍰 *Format salah, sayang~*\n\n*Gunakan salah satu dari ini:*\n\n🍓 *${usedPrefix + command} open (Buka grup)*\n🍓 *${usedPrefix + command} close (Tutup grup)*`.trim())
await conn.groupSettingUpdate(m.chat, isClose)
m.reply(`🍬 *Berhasil! Grup sekarang telah ${args[0] === 'open' ? 'dibuka' : 'ditutup'}~*`)
}

handler.help = ['group <open|close>']
handler.tags = ['group']
handler.command = /^(g|group)$/i
handler.group = true
handler.owner = true
handler.botAdmin = true

export default handler