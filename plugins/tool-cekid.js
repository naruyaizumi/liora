
import pkg from 'baileys'
const { proto, generateWAMessageFromContent } = pkg

let handler = async (m, { conn, args }) => {
let text = args[0]
if (!text || !text.includes('whatsapp.com')) return m.reply('🍰 *Masukkan link grup atau saluran WhatsApp, sayang~*')
let isGroup = text.includes("chat.whatsapp.com")
let isChannel = text.includes("whatsapp.com/channel/")
let id, name
try {
if (isGroup) {
let code = text.split("chat.whatsapp.com/")[1]
let res = await conn.groupGetInviteInfo(code)
id = res.id
name = res.subject
} else if (isChannel) {
let code = text.split("whatsapp.com/channel/")[1].split('?')[0]
let res = await conn.newsletterMetadata('invite', code, 'GUEST')
id = res.id
name = res.name
} else return m.reply("🍩 *Link tidak valid. Masukkan link grup atau saluran WhatsApp ya~*")
} catch (err) {
console.error(err)
return m.reply("🧁 *Maaf, gagal mengambil data dari link itu...*")
}
let messageText = `🍬 *Informasi Ditemukan!* 🍬
━━━━━━━━━━━━━━━━━━━━
🍡 *Nama: ${name}*
🍭 *ID: ${id}*
━━━━━━━━━━━━━━━━━━━━
🧋 *Salin ID ini untuk digunakan di fitur lain!*`
let msg = generateWAMessageFromContent(m.chat, {
interactiveMessage: proto.Message.InteractiveMessage.create({
body: { text: messageText },
footer: { text: "© Naruya Izumi 2024 - Crystalia ID Service" },
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: [
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: "📋 Salin ID",
copy_code: id
})
}
]
})
})
}, { quoted: m })
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.help = ['cekid']
handler.tags = ['tool']
handler.command = /^(cekid|id)$/i

export default handler