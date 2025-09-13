
let handler = async (m, { conn, text, usedPrefix, command }) => {
let chat = global.db.data.chats[m.chat]
switch (text) {
case 'off':
case 'mute':
if (chat.mute) return m.reply('⚠️ *Saya sudah offline sayang~*')
chat.mute = true
conn.reply(m.chat, '🌸 *SUKSES SAYANG... Sekarang bot dalam mode diam!* 🤫', m)
break
case 'on':
case 'unmute':
if (!chat.mute) return m.reply('⚠️ *Saya sudah online sayang~*')
chat.mute = false
conn.reply(m.chat, '🌸 *SUKSES SAYANG... Bot aktif kembali ya!* 💬', m)
break
default:
m.reply(`❗ *Format salah!*\n\n💡 *Contoh: ${usedPrefix + command} on/off*`)
}
}

handler.help = ['botmode']
handler.tags = ['group']
handler.command = /^(bot(mode)?)$/i
handler.owner = true

export default handler