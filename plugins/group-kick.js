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
targets = [...new Set(targets)].filter(v => v !== m.sender && participants.some(p => p.id === v))
if (!targets.length) 
return m.reply(`🍩 *Tag, reply, atau masukkan nomor anggota yang ingin dikeluarkan ya sayang~*\n\n*Contoh:* ${usedPrefix + command} @628xx`)
for (let target of targets) {
await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
if (/^dor$/i.test(command)) {
await m.reply(`🔫 *DORRR!!!* 🍬 *Target berhasil dikeluarkan ya sayang~*`)
}
await delay(1500)
}
}

handler.help = ['kick']
handler.tags = ['group']
handler.command = /^(kick|k|dor)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler

const delay = ms => new Promise(res => setTimeout(res, ms))