
import pkg from 'baileys'
const { proto, generateWAMessageFromContent } = pkg

let handler = async (m, { conn, groupMetadata }) => {
try {
let link = `https://chat.whatsapp.com/${await conn.groupInviteCode(m.chat)}`
let teks = `💖 *Nama Grup: ${groupMetadata.subject}*
✨ *ID Grup: ${m.chat}*

*Klik tombol di bawah untuk menyalin link grup dan bagikan ke temanmu!* 💌`
let msg = generateWAMessageFromContent(m.chat, {
interactiveMessage: proto.Message.InteractiveMessage.create({
body: { text: teks },
footer: { text: "© Naruya Izumi 2024" },
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: [
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: "🌸 Salin Link 🌸",
copy_code: link
})
}
]
})
})
}, { quoted: m })
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
} catch (e) {
m.reply('*Gagal mengambil link grup, pastikan grup ini tidak dalam mode privat.*')
}
}

handler.help = ['grouplink']
handler.tags = ['group']
handler.command = /^(grouplink|link)$/i
handler.group = true
handler.botAdmin = true

export default handler