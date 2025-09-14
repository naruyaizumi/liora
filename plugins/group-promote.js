let handler = async (m, { conn, args, participants, command, usedPrefix }) => {
let targets = []
const getRealJid = (jid) => {
if (jid.endsWith('@lid')) {
let p = participants.find(u => u.lid === jid)
return p?.id || jid
}
return jid
}
if (m.mentionedJid.length) targets.push(...m.mentionedJid.map(j => getRealJid(j)))
if (m.quoted && m.quoted.sender) targets.push(getRealJid(m.quoted.sender))
for (let arg of args) {
if (/^\d{5,}$/.test(arg)) {
let jid = arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
targets.push(getRealJid(jid))
}
}
targets = [...new Set(targets)].filter(v => participants.some(p => p.id === v))
if (!targets.length) 
return m.reply(`🍩 *Masukkan nomor, tag, atau reply pengguna yang ingin dijadikan admin ya sayang~*\n\n*Contoh: ${usedPrefix + command} @628xx*`)
for (let target of targets) {
await conn.groupParticipantsUpdate(m.chat, [target], 'promote')
await m.reply(`🍓 *Berhasil menjadikan admin:* @${target.split('@')[0]}`, null, { mentions: [target] })
await delay(1500)
}
}

handler.help = ['promote']
handler.tags = ['group']
handler.command = /^(promote)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler

const delay = ms => new Promise(res => setTimeout(res, ms))