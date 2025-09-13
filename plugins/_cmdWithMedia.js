import pkg from 'baileys'
const { proto, generateWAMessage, areJidsSameUser } = pkg

export async function before(m, { conn, isAdmin, isOwner, isMods, isBotAdmin }) {
if (m.isBaileys || m.fromMe || !m.message || !m.msg?.fileSha256) return
let hash = Buffer.from(m.msg.fileSha256).toString('base64')
global.db.data.bot = global.db.data.bot || {}
global.db.data.bot.stickerBlacklist = global.db.data.bot.stickerBlacklist || {}
let isStickerBlacklisted = global.db.data.bot.stickerBlacklist[hash]
if (isStickerBlacklisted) {
if (!isBotAdmin) return
if (!(isOwner || isAdmin || isMods)) {
try {
await conn.sendMessage(m.chat, { delete: m.key })
} catch (e) {
console.error('❌ Gagal hapus stiker blacklist:', e)
}
return
}
}
global.db.data.users[m.sender].sticker = global.db.data.users[m.sender].sticker || {}
if (!(hash in global.db.data.users[m.sender].sticker)) return
let { text, mentionedJid } = global.db.data.users[m.sender].sticker[hash]
let messages = await generateWAMessage(m.chat, { text, mentions: mentionedJid }, {
userJid: conn.user.id,
quoted: m.quoted && m.quoted.fakeObj
})
messages.key.fromMe = areJidsSameUser(m.sender, conn.user.id)
messages.key.id = m.key.id
messages.pushName = m.pushName
if (m.isGroup) messages.participant = m.sender
let msg = {
messages: [proto.WebMessageInfo.fromObject(messages)],
type: 'append'
}
conn.ev.emit('messages.upsert', msg)
}