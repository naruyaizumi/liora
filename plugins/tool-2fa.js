
import pkg from "baileys"
const { generateWAMessageFromContent, proto } = pkg

let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`❌ *Harap masukkan token!*\n\n📌 *Contoh: ${usedPrefix + command} abcdefg*`)
await global.loading(m, conn)
let res = await fetch(global.API("btz", "/api/tools/2fa", { token: text }, "apikey"))
let json = await res.json()
if (!json.status || !json.result?.token) return m.reply("❌ *Gagal mengambil token 2FA!*")
let code = json.result.token
let detail = `
🔐 *2FA Token Ditemukan!*
━━━━━━━━━━━━━━━━━━━━
🧾 *Token: ${code}*
📌 *Salin token ini untuk kebutuhan verifikasi 2FA kamu.*
━━━━━━━━━━━━━━━━━━━━
`.trim()
let msg = await generateWAMessageFromContent(m.chat, {
interactiveMessage: proto.Message.InteractiveMessage.create({
body: { text: detail },
footer: { text: "🍰 2FA Tool" },
header: {
title: "🔑 Kode 2FA",
hasMediaAttachment: false
},
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: [
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: "📋 Salin Token",
id: "copy_2fa",
copy_code: code
})
}
]
})
})
}, { quoted: m })
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
} catch (e) {
console.error(e)
m.reply("⚠️ *Terjadi kesalahan teknis, coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['2fa']
handler.tags = ['tools']
handler.command = /^(2fa)$/i
handler.limit = true
handler.register = true

export default handler