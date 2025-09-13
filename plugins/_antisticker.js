
export async function before(m, { isAdmin, isBotAdmin, isMods }) {
if (m.isBaileys || m.fromMe) return
let chat = global.db.data.chats[m.chat]
if (!chat.antiSticker || !m.isGroup || m.mtype !== "stickerMessage") return
const isOwner = global.config.owner.some(([number]) => m.sender.includes(number))
if (isOwner || isAdmin || isMods) return true
await this.sendMessage(m.chat, { delete: m.key })
return true
}