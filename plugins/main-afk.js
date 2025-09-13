
const linkRegex = /chat.whatsapp.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i
let handler = async(m,{text:txt})=>{
let user = global.db.data.users[m.sender]
let chat = global.db.data.chats[m.chat]
user.afk =+ new Date
let isGroupLink = linkRegex.exec(txt)
let reason = chat.antiLinkGc && isGroupLink?'⚠️ *Terdeteksi mengirim link grup!*':txt
if(reason.length>100)reason = reason.slice(0,100)+'...'
user.afkReason = reason
m.reply(`☁️ *${user.registered?user.name:conn.getName(m.sender)} sedang AFK*
📌 *Alasan: ${reason || 'Tidak ada alasan.'}*
📅 *Jangan lupa kembali ya!*`)
}

handler.help = ['afk']
handler.tags = ['main']
handler.command = /^afk$/i
handler.register = true
handler.group = true

export default handler