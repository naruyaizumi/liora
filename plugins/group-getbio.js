
let handler = async (m, { conn, text }) => {
try {
let who
if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender
else who = m.quoted.sender ? m.quoted.sender : m.sender
let bio = await conn.fetchStatus(who)
m.reply(bio?.status?.status || '*bio is empty or private*')
} catch {
if (text) return m.reply(`*bio is private!*`)
else try {
let who = m.quoted ? m.quoted.sender : m.sender
let bio = await conn.fetchStatus(who)
m.reply(bio?.status?.status || '*bio is empty or private*')
} catch {
return m.reply(`*bio is private!*`)
}
}
}
handler.help = ['getbio']
handler.tags = ['group']
handler.command = /^(getb?io)$/i
handler.owner = true
export default handler