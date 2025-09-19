let handler = async (m, { conn, args, usedPrefix, command }) => {
let targets = []
for (let arg of args) {
if (/^\d{5,}$/.test(arg)) {
let jid = arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
targets.push(jid)
}
}
targets = [...new Set(targets)]
if (!targets.length)
return m.reply(`🍡 *Contoh penggunaan:* ${usedPrefix + command} 628xxxx 628xxxx`)
let msg = `🍓 *Tambah anggota selesai!*\n`
let inviteCode = await conn.groupInviteCode(m.chat)
let groupMeta = await conn.groupMetadata(m.chat)
for (let target of targets) {
try {
let res = await conn.groupParticipantsUpdate(m.chat, [target], 'add')
if (res[0]?.status === '200') {
msg += `🧁 *Berhasil:* @${target.split('@')[0]}\n`
} else {
await conn.sendMessage(target, {
groupInvite: {
jid: m.chat,
name: groupMeta.subject,
caption: '📨 *Please join my WhatsApp group!*',
code: inviteCode,
expiration: 86400
}
})
msg += `🍬 *Undangan terkirim ke:* @${target.split('@')[0]} *(akun private)*\n`
}
} catch (e) {
console.error(e)
msg += `🍩 *Gagal:* @${target.split('@')[0]}\n`
}
await delay(1500)
}
m.reply(msg.trim(), null, { mentions: targets })
}

handler.help = ['add']
handler.tags = ['group']
handler.command = /^(add)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler

const delay = ms => new Promise(res => setTimeout(res, ms))