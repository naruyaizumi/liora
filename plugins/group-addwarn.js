
let handler = async (m, { conn, args }) => {
if (!m.mentionedJid[0]) throw `🍬 *Tag user yang ingin diberi warning*\n\n*Contoh: .addwarn @user amount*`
let user = global.db.data.users[m.mentionedJid[0]]
let jumlah = parseInt(args[1]) || 1
user.warning += jumlah
await m.reply(`🍭 *Warning Ditambahkan!*\n\n👤 *User: @${m.mentionedJid[0].split('@')[0]}*\n⚠️ *Total Warning: ${user.warning}*\n🧁 *Jangan sering bikin masalah ya~*`, false, { mentions: [m.mentionedJid[0]] })
}

handler.help = ['addwarning']
handler.tags = ['group']
handler.command = /^(addwarn|addwarning)$/i
handler.group = true
handler.admin = true
handler.register = true

export default handler