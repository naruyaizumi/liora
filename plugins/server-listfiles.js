
let handler = async (m, { args, conn }) => {
const domain = global.config.domain
const capikey = global.config.capikey
const apikey = global.config.apikey
const serverId = args[0]
const directory = args[1] || "/"
if (!serverId) return m.reply("❌ *Mohon masukkan Server ID!*")
try {
const serversResponse = await fetch(`${domain}/api/application/servers`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`
}
})
const serversData = await serversResponse.json()
if (!serversResponse.ok || !serversData.data) return m.reply("❌ *Gagal mengambil daftar server!*")
const server = serversData.data.find(s => s.attributes.id === parseInt(serverId))
if (!server) return m.reply(`❌ *Server dengan ID ${serverId} tidak ditemukan!*`)
const identifier = server.attributes.identifier
const response = await fetch(`${domain}/api/client/servers/${identifier}/files/list?directory=${encodeURIComponent(directory)}`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${capikey}`
}
})
const data = await response.json()
if (!response.ok || !data.data) return m.reply("❌ *Gagal mengambil daftar file atau folder kosong!*")
const formatBytes = (bytes) => {
if (bytes === 0) return "0 B"
const sizes = ["B", "KB", "MB", "GB", "TB"]
const i = Math.floor(Math.log(bytes) / Math.log(1024))
return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}
let messageText = `📂 *Daftar File dalam Direktori:* \`${directory}\`\n\n`
if (data.data.length === 0) {
messageText += "⚠️ *Tidak ada file atau folder dalam direktori ini!*"
} else {
messageText += `*╭━━━━━━━━━━━━━━━━━━━━━━━╮*\n`
for (let file of data.data) {
const attributes = file.attributes
const fileType = attributes.is_file ? "📄 File" : "📁 Folder"
const modifiedAt = attributes.modified_at ? new Date(attributes.modified_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Unknown"
messageText += `*│ ${fileType}: ${attributes.name}*\n`
messageText += `*│ Ukuran: ${attributes.is_file ? formatBytes(attributes.size) : "-"}*\n`
messageText += `*│ Diubah: ${modifiedAt}*\n`
messageText += `*├───────────────────────*\n`
}
messageText += `*│ Pterodactyl® © 2015 - 2025*
*╰━━━━━━━━━━━━━━━━━━━━━━━╯*`
}
const thumbnailUrl = "https://img86.pixhost.to/images/493/563104371_izumizopedia.jpg"
const externalAdReply = {
title: "💾 𝙇𝙄𝙎𝙏 𝙁𝙄𝙇𝙀𝙎 𝙎𝙀𝙍𝙑𝙀𝙍 💾",
body: `📅 ${new Date().toLocaleDateString()} ⏰ ${new Date().toLocaleTimeString()}`,
thumbnailUrl: thumbnailUrl,
mediaType: 1,
sourceUrl: "https://instagram.com/naruyaizumi_",
renderLargerThumbnail: true
}
await conn.sendMessage(m.chat, {
text: messageText,
contextInfo: { externalAdReply }
}, { quoted: m })
} catch (error) {
console.error(error.message)
m.reply(`❌ *Terjadi kesalahan: ${error.message}*`)
}
}

handler.help = ["listfiles"]
handler.tags = ["server"]
handler.command = /^(listfiles|lf)$/i
handler.owner = true

export default handler