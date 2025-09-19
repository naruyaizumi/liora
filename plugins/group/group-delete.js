let handler = async (m, { conn }) => {
if (!m.quoted) return
let { chat, id, participant, sender } = m.quoted
let quotedSender = participant || sender
if (global.config.owner.some(([num]) => quotedSender.includes(num)) || (global.mods && global.mods.includes(quotedSender))) {
return m.reply(`🍩 *Tidak bisa menghapus pesan dari Owner/Developer!*`)
}
try {
await conn.sendMessage(chat, {
delete: {
remoteJid: m.chat,
fromMe: false,
id,
participant: quotedSender
}
})
} catch (e) {
console.error(e)
m.reply(`🍬 *Gagal menghapus pesan. Mungkin sudah tidak ada atau bukan milik pengguna lain.*`)
}
}

handler.help = ['delete']
handler.tags = ['group']
handler.command = /^(d|delete|del)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler