
let handler = async (m, { conn, isOwner }) => {
if (!m.quoted) return
let { chat, fromMe, id, participant, sender } = m.quoted
let charm = global.db.data.chats[m.chat]
let isGroupMsg = m.isGroup
let quotedSender = participant || sender
let isOwnerQuoted = global.config.owner.some(([num]) => quotedSender.includes(num))
let isModsQuoted = global.mods && global.mods.includes(quotedSender)
let isProtected = isOwnerQuoted || isModsQuoted
if (isProtected) return m.reply(`⚠️ *Tidak dapat menghapus pesan dari Owner/Developer!*`)
try {
if ((!charm?.nsfw && isGroupMsg) || isOwner) {
await conn.sendMessage(chat, {
delete: {
remoteJid: m.chat,
fromMe: false,
id,
participant: quotedSender
}
})
} else {
m.reply(`🚫 *Tidak dapat hapus pesan saat NSFW aktif!*`)
}
} catch (e) {
console.log(e)
m.reply('❌ *Gagal menghapus pesan. Mungkin sudah tidak tersedia atau bukan milik pengguna lain.*')
}
}

handler.help = ['delete']
handler.tags = ['group']
handler.command = /^(d|delete|del)$/i
handler.group = true
handler.register = true
handler.admin = true

export default handler