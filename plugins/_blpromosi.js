export async function before(m, { conn }) {
if (!m.isGroup) return
let chat = global.db.data.chats[m.chat]
if (chat?.blpromosi) return !0
}