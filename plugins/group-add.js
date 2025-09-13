
let handler = async (m, { conn, args, usedPrefix, command }) => {
let numbers = args.filter(arg => arg.match(/^\d+$/)).map(num => num.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
if (!numbers.length) return m.reply(`🍡 *Contoh penggunaan: ${usedPrefix + command} 628xxxx 628xxxx*`)
try {
let res = await conn.groupParticipantsUpdate(m.chat, numbers, 'add')
let success = res.filter(r => r.status === '200')
let failed = res.filter(r => r.status !== '200')
let msg = `🍓 *Tambah anggota selesai!*\n`
if (success.length) msg += `🧁 Berhasil: ${success.map(u => '@' + u.jid.split('@')[0]).join(', ')}\n`
if (failed.length) {
let code = await conn.groupInviteCode(m.chat)
msg += `🍩 Gagal: ${failed.map(u => '@' + u.jid.split('@')[0]).join(', ')}\n`
msg += `🎟️ *Link invite: https://chat.whatsapp.com/${code}*`
}
m.reply(msg.trim(), null, { mentions: numbers })
} catch (e) {
console.error(e)
m.reply('🍩 *Yahh gagal nambahin anggota... mungkin ada yang private atau nomornya salah~*')
}
}

handler.help = ['add']
handler.tags = ['group']
handler.command = /^(add)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler