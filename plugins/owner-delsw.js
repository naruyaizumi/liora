
import baileys from "baileys"

let handler = async (m, { conn }) => {
if (!Array.isArray(global.storyIds) || global.storyIds.length === 0)
return m.reply('🚫 *Tidak ada status yang bisa dihapus.*')
for (let id of global.storyIds) {
try {
await conn.sendMessage(baileys.STORIES_JID, {
delete: {
remoteJid: baileys.STORIES_JID,
fromMe: true,
id
}
})
await delay(1000)
} catch (e) {
console.error(`Gagal hapus story ID: ${id}`, e)
}
}
global.storyIds = []
m.reply('*Semua status berhasil dihapus.*')
}

handler.help = ['delsw']
handler.tags = ['owner']
handler.command = /^(delsw)$/i
handler.owner = true

export default handler

function delay(ms) {
return new Promise(resolve => setTimeout(resolve, ms))
}