
export async function before(m, { isAdmin, isMods }) {
let isOwner = global.config.owner.some(([number]) => m.sender.includes(number))
if (isOwner || isAdmin || isMods) return true
if (!global.db.data.chats[m.chat]?.antitagsw) return
let msg = m.message
if (msg?.groupStatusMentionMessage) {
await this.sendMessage(m.chat, {
delete: {
remoteJid: m.chat,
fromMe: false,
id: m.key.id,
participant: m.key.participant
}
})
}

return true
}