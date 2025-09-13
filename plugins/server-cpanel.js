import crypto from "crypto"
import pkg from 'baileys'
const { proto, generateWAMessageFromContent } = pkg

const formatRamDisk = (value) => value === "0" ? "Unlimited" : value.length > 4 ? value.slice(0, 2) + "GB" : value.charAt(0) + "GB"
const formatCpu = (value) => value === "0" ? "Unlimited" : value + "%"
const plans = {
"1gb": { ram: "1024", disk: "2024", cpu: "30", days: 30 },
"2gb": { ram: "2048", disk: "4072", cpu: "50", days: 30 },
"4gb": { ram: "4096", disk: "10216", cpu: "100", days: 30 },
"6gb": { ram: "6144", disk: "15336", cpu: "150", days: 30 },
"8gb": { ram: "8192", disk: "20456", cpu: "200", days: 30 },
"12gb": { ram: "12288", disk: "30456", cpu: "250", days: 30 },
"16gb": { ram: "16384", disk: "40456", cpu: "0", days: 30 },
"unlimited": { ram: "0", disk: "0", cpu: "0", days: 30 }
}
let handler = async (m, { conn, args }) => {
let input = args.join(" ").split(".")
if (input.length < 2) return m.reply("⚠️ *Format salah!*\n📌 *Contoh: .cpanel izumi.62xxx*")
let [username, numberRaw, planKey] = input
let number = numberRaw.replace(/[^\d+]/g, '') + "@s.whatsapp.net"
if (!planKey) {
let list = Object.keys(plans).map((plan, i) => [
`.cpanel ${username}.${numberRaw}.${plan}`,
(i + 1).toString(),
`💻 RAM: ${formatRamDisk(plans[plan].ram)} | 📡 Disk: ${formatRamDisk(plans[plan].disk)} | ⚡ CPU: ${formatCpu(plans[plan].cpu)}`
])
return await conn.textList(m.chat, `📌 *Pilih spesifikasi server Anda:*`, false, list, m)
}
let plan = plans[planKey]
if (!plan) return m.reply("❌ *Paket tidak valid!*")
let expiresAt = Date.now() + (plan.days * 86400000)
let email = `${username}@naruyaizumi.com`
let password = crypto.randomBytes(3).toString("hex")
try {
let userResponse = await fetch(`${global.config.domain}/api/application/users`, {
method: "POST",
headers: {
Accept: "application/json", "Content-Type": "application/json",
Authorization: `Bearer ${global.config.apikey}`
},
body: JSON.stringify({
email,
username,
first_name: username,
last_name: "© IZUMI",
language: "en",
password
})
})
let userData = await userResponse.json()
if (!userResponse.ok || userData.errors) {
let errorMessage = userData.errors ? userData.errors[0].detail : "Gagal membuat pengguna di panel."
return m.reply(`❌ ${errorMessage}`)
}
let usr_id = userData.attributes.id
let eggData = await fetch(`${global.config.domain}/api/application/nests/${global.config.nestid}/eggs/${global.config.egg}`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${global.config.apikey}`,
},
})
let eggInfo = await eggData.json()
if (!eggData.ok || !eggInfo.attributes || !eggInfo.attributes.startup) {
return m.reply("😢 *Aduh, gagal membaca konfigurasi startup dari Egg~* 💔\n*Coba cek lagi ID Nest dan ID Egg-nya, ya!* ✨")
}
let startup_cmd = eggInfo.attributes.startup
let serverResponse = await fetch(`${global.config.domain}/api/application/servers`, {
method: "POST",
headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${global.config.apikey}` },
body: JSON.stringify({
name: username,
description: "COPYRIGHT © 2025 NARUYA IZUMI.",
user: userData.attributes.id,
egg: parseInt(global.config.egg),
docker_image: "docker.io/bionicc/nodejs-wabot:22",
startup: startup_cmd,
environment: {
INST: "npm",
USER_UPLOAD: "0",
AUTO_UPDATE: "0",
CMD_RUN: "npm start"
},
limits: {
memory: plan.ram,
swap: 0,
disk: plan.disk,
io: 500,
cpu: plan.cpu
},
feature_limits: {
databases: 3,
backups: 3,
allocations: 3 },
deploy: {
locations: [parseInt(global.config.loc)],
dedicated_ip: false, port_range: []
}
})
})
let serverData = await serverResponse.json()
if (!serverResponse.ok || serverData.errors) return m.reply(`❌ ${serverData.errors ? serverData.errors[0].detail : "Gagal membuat server di panel."}`)
let server = serverData.attributes
let teks = `
📑 *\`DETAIL AKUN\`*
━━━━━━━━━━━━━━━━━━━━
📌 *ID Server: ${server.id}*
📛 *Nama: ${username}*
👤 *Username: ${userData.attributes.username}*
📧 *Email: ${email}*
🔑 *Password: ${password}*
🕒 *Masa Berlaku: ${new Date(expiresAt).toLocaleDateString('id-ID')}*
🌐 *Login: ${global.config.domain}*
💻 *\`SPESIFIKASI\`*
━━━━━━━━━━━━━━━━━━━━
🖥️ *RAM: ${formatRamDisk(plan.ram)}*
📡 *Disk: ${formatRamDisk(plan.disk)}*
📈 *CPU: ${formatCpu(plan.cpu)}*
`
let msg = await generateWAMessageFromContent(number, {
interactiveMessage: proto.Message.InteractiveMessage.create({
body: { text: teks },
footer: { text: "✨ Naruya Izumi 2024 ✨" },
header: { title: "Detail Akun", hasMediaAttachment: false },
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: [
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: "📋 Salin Username",
copy_code: userData.attributes.username
})
},
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: "🔑 Salin Password",
copy_code: password
})
},
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "🫧 Login Web",
url: global.config.domain,
merchant_url: global.config.domain
})
}
]
})
})
}, { quoted: m })
await conn.relayMessage(number, msg.message, { messageId: msg.key.id })
m.reply("🌸 *Detail akun berhasil dikirim ke nomor tujuan!* 😊")
} catch (error) {
console.error(error)
m.reply("❌ *Terjadi kesalahan dalam pembuatan server, coba lagi nanti!*")
}
}

handler.help = ["cpanel"]
handler.tags = ["server"]
handler.command = /^cpanel$/i
handler.premium = true
handler.register = true

export default handler