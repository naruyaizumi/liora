
import pkg from "baileys"
const { generateWAMessageFromContent, proto } = pkg

let handler = async (m, { conn }) => {
try {
await global.loading(m, conn)
let apiUrl = global.API('btz', '/api/tools/create-temp-mail', {}, 'apikey')
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status || !json.result) throw '❌ *Gagal membuat email sementara.*'
let email = json.result
let detail = `
📧 *Temporary Email Berhasil Dibuat!*
━━━━━━━━━━━━━━━━━━━━
📝 *Alamat Email: ${email}*
⏳ *Berlaku sementara*

💡 *Klik tombol di bawah untuk salin email-nya~*
━━━━━━━━━━━━━━━━━━━━
`.trim()
let button = [
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: "📋 Salin Email",
id: "copy_email",
copy_code: email
})
}
]
let msg = await generateWAMessageFromContent(m.chat, {
interactiveMessage: proto.Message.InteractiveMessage.create({
body: { text: detail },
footer: { text: "🍰 Temp Mail Generator" },
header: {
title: "📨 Temp Mail",
hasMediaAttachment: false
},
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: button
})
})
}, { quoted: m })
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
} catch (e) {
console.error(e)
m.reply('⚠️ *Terjadi kesalahan teknis, coba lagi nanti.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['tmpmail']
handler.tags = ['tools']
handler.command = /^(tmpmail)$/i
handler.register = true
handler.limit = true

export default handler