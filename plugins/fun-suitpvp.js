let timeout = 60000
let poin = 100000
let poin_lose = 100000

let handler = async (m, { conn, usedPrefix }) => {
try {
if (!conn.suit) conn.suit = {}
if (Object.values(conn.suit).find(room => room.id.startsWith('suit') && [room.p, room.p2].includes(m.sender)))
return m.reply('*Selesaikan suit mu yang sebelumnya*')
if (m.mentionedJid && Object.values(conn.suit).find(room => room.id.startsWith('suit') && [room.p, room.p2].includes(m.mentionedJid[0])))
return m.reply('*Orang yang kamu tantang sedang bermain suit bersama orang lain!*')
let musuh = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted && m.quoted.sender ? m.quoted.sender : false
if (!musuh) {
return m.reply(`*Siapa yang ingin kamu tantang?*\n*Tag orangnya.. Contoh ${usedPrefix}suitpvp* @${m.sender.split('@')[0]} 🍓`, m.chat, {
contextInfo: { mentionedJid: [m.sender] }
})
}
if (m.isGroup && musuh?.endsWith('@lid')) {
const groupMeta = (conn.chats[m.chat] || {}).metadata || await conn.groupMetadata(m.chat).catch(_ => null)
const peserta = groupMeta?.participants?.find(u => u.lid === musuh)
if (peserta) musuh = peserta.id
}
let id = 'suit_' + new Date() * 1
let caption = `
🍓 *SUIT PvP* 🍓

@${m.sender.split('@')[0]} *menantang* @${musuh.split('@')[0]} *untuk bermain suit* 🎀

*Silahkan* @${musuh.split('@')[0]} 🍰
`.trim()
let footer = `
*Ketik "terima","ok","gas" untuk memulai suit* 🍭
*Ketik "tolak","gabisa","nanti" untuk menolak* 🍩`

let chat = await conn.sendMessage(m.chat, {
text: caption + footer,
mentions: [m.sender, musuh]
}, { quoted: m })
conn.suit[id] = {
chat: chat,
id: id,
p: m.sender,
p2: musuh,
status: 'wait',
waktu: setTimeout(() => {
if (conn.suit[id]) {
conn.reply(m.chat, '*Waktu suit habis*', m)
delete conn.suit[id]
}
}, timeout),
poin,
poin_lose,
timeout
}
} catch (e) {
console.error(e)
m.reply('❌ *Terjadi kesalahan saat memulai suit!*')
}
}

handler.help = ['suitpvp']
handler.tags = ['fun']
handler.command = /^suitpvp$/i
handler.group = true
handler.register = true

export default handler