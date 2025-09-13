
export async function before(m, { conn }) {
if (m.isBaileys && m.fromMe) return true
let chat = global.db.data.chats[m.chat]
if (!chat.viewonce) return true
if (m.mtype === 'viewOnceMessageV2' || m.mtype === 'viewOnceMessage') {
let msg = m.message?.viewOnceMessageV2Message?.message || m.message?.viewOnceMessage?.message
let type = Object.keys(msg || {})[0]
let media = await conn.downloadMediaMessage({ message: { [type]: msg[type] } })
if (!media) return
await conn.sendFile(m.chat, media, null, '', m)
}
return true
}