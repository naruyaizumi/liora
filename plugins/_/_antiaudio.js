export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isMods }) {
  if (m.isBaileys && m.fromMe) return true
  if (isOwner || isAdmin || isMods) return true

  const chat = global.db.data.chats[m.chat]
  if (!chat) return true
  if (!chat.antiAudio || !isBotAdmin) return true

  if (m.mtype === "audioMessage") {
    const isPTT = m.message.audioMessage?.ptt || false
    if (isPTT || !isPTT) {
      try {
        await conn.sendMessage(m.chat, {
          delete: {
            remoteJid: m.chat,
            fromMe: false,
            id: m.key.id,
            participant: m.key.participant,
          },
        })
      } catch (e) {
        console.error("Failed to delete audio:", e)
      }
    }
  }

  return true
}