
import crypto from "crypto"
import pkg from 'baileys'
const { proto, generateWAMessageFromContent } = pkg

let handler = async (m, { args, conn }) => {
if (!args[0]) return m.reply("❌ *Format salah! Gunakan: .resetpw <UserID>.<NomorWhatsApp>*")
const domain = global.config.domain
const apikey = global.config.apikey
const [userId, phoneNumberRaw] = args[0].split(".")
if (!userId || !phoneNumberRaw) return m.reply("❌ *Format salah! Gunakan: .resetpw <UserID>.<Nomor>*")
const phoneNumber = `${phoneNumberRaw}@s.whatsapp.net`
const newPassword = crypto.randomBytes(3).toString("hex")
const userResponse = await fetch(`${domain}/api/application/users/${userId}`, {
method: "GET",
headers: {
Accept: "application/json",
Authorization: `Bearer ${apikey}`
}
})
if (!userResponse.ok) {
const error = await userResponse.json()
throw new Error(error.errors ? error.errors[0].detail : "Gagal mengambil data pengguna!")
}
const userData = await userResponse.json()
const email = userData.attributes.email || ""
const username = userData.attributes.username || ""
const firstName = userData.attributes.first_name || "User"
const lastName = userData.attributes.last_name || ""
const language = userData.attributes.language || "en"
const rootAdmin = userData.attributes.root_admin || false
const patchResponse = await fetch(`${domain}/api/application/users/${userId}`, {
method: "PATCH",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`
},
body: JSON.stringify({
email,
username,
first_name: firstName,
last_name: lastName,
password: newPassword,
root_admin: rootAdmin,
language
})
})
if (!patchResponse.ok) {
const error = await patchResponse.json()
throw new Error(error.errors ? error.errors[0].detail : "Gagal mengganti password!")
}
const teks = `
📋 *RESET PASSWORD BERHASIL* 📋
━━━━━━━━━━━━━━━━━━━━━━━
👤 *User ID: ${userId}*
📛 *Username: ${username}*
📧 *Email: ${email}*
🔑 *Password Baru: ${newPassword}*
━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Silakan login dengan password baru ini.*
`
const msg = generateWAMessageFromContent(phoneNumber, {
interactiveMessage: proto.Message.InteractiveMessage.create({
body: { text: teks },
footer: { text: "✨ Naruya Izumi 2025 ✨" },
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: [
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: "📋 Salin Password",
copy_code: newPassword
})
}
]
})
})
}, { quoted: m })
await conn.relayMessage(phoneNumber, msg.message, { messageId: msg.key.id })
m.reply(`🌸 *Password berhasil direset! Detail telah dikirim ke nomor: ${phoneNumberRaw}*`)
}

handler.help = ["resetpw"]
handler.tags = ["server"]
handler.command = /^(resetpw)$/i
handler.owner = true

export default handler