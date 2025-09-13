const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s]*)?/gi

export async function before(m, { isAdmin, isBotAdmin, isMods }) {
const isOwner = global.config.owner.some(([number]) => m.sender.includes(number))
if (m.isBaileys || m.fromMe || isOwner || isAdmin || isMods) return true
let chat = global.db.data.chats[m.chat]
if (!chat.antiLinks || !m.isGroup) return
if (typeof m.text === 'string' && linkRegex.test(m.text)) {
await this.sendMessage(m.chat, {
delete: {
remoteJid: m.chat,
fromMe: false,
id: m.key.id,
participant: m.key.participant || m.sender
}
})
}
return true
}