
let handler = async (m, { args, conn }) => {
const pageInput = args[0] ? parseInt(args[0]) : 1
const domain = global.config.domain
const apikey = global.config.apikey
const capikey = global.config.capikey
let messageText = ""
try {
const usersResponse = await fetch(`${domain}/api/application/users`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`,
},
})
const usersRes = await usersResponse.json()
if (!usersResponse.ok || usersRes.errors) {
const errorMessage = usersRes.errors ? usersRes.errors[0].detail : "Gagal mengambil data user."
return conn.sendMessage(m.chat, { text: `❌ ${errorMessage}` }, { quoted: m })
}
const itemsPerPage = 20
const totalItems = usersRes.data.length
const totalPages = Math.ceil(totalItems / itemsPerPage)
if (pageInput > totalPages || pageInput < 1) {
return conn.sendMessage(m.chat, { text: `❌ *Halaman tidak tersedia! Total halaman: ${totalPages}*` }, { quoted: m })
}
const startIndex = (pageInput - 1) * itemsPerPage
const endIndex = startIndex + itemsPerPage
const paginatedData = usersRes.data.slice(startIndex, endIndex)
const serversResponse = await fetch(`${domain}/api/application/servers`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`,
},
})
const serversRes = await serversResponse.json()
if (!serversResponse.ok || serversRes.errors) {
const errorMessage = serversRes.errors ? serversRes.errors[0].detail : "Gagal mengambil data server."
return conn.sendMessage(m.chat, { text: `❌ ${errorMessage}` }, { quoted: m })
}
const serversByUser = {}
for (const server of serversRes.data) {
const s = server.attributes
const userId = s.user
if (!serversByUser[userId]) serversByUser[userId] = []
const resourceResponse = await fetch(`${domain}/api/client/servers/${s.identifier}/resources`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${capikey}`,
},
})
const resourceData = await resourceResponse.json()
let status = "SUSPENDED"
if (resourceData && resourceData.attributes && resourceData.attributes.resources) {
status = resourceData.attributes.current_state.toUpperCase() || "SUSPENDED"
}
serversByUser[userId].push({
id: s.id,
name: s.name,
identifier: s.identifier,
suspended: s.suspended ? "🍃 YES" : "🍂 NO",
status,
})
}
let counter = 1
for (let user of paginatedData) {
const u = user.attributes
const pagePrefix = `${pageInput}.${counter++}`
const expiredDate = new Date(u.created_at).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })
messageText += `
*${pagePrefix}. 🪪 \`User Details\`*
📢 *User ID: ${u.id}*
📛 *Username: ${u.username}*
⭐ *Administrator: ${u.root_admin ? "🍃 YES" : "🍂 NO"}*
📅 *Expired: ${expiredDate}*
`
const userServers = serversByUser[u.id] || []
if (userServers.length > 0) {
userServers.forEach((s, index) => {
messageText += `🖥️ *\`Server: ${index + 1}\`*
🚀 *Server Name: ${s.name}*
📡 *Server ID: ${s.id}*
📌 *Status: ${s.status}*
⚠️ *Suspended : ${s.suspended}*
`
})
} else {
messageText += `*🖥 Servers: ❌ Tidak ada server untuk user ini.*`
}
messageText += `\n━━━━━━━━━━━━━━━━━━━\n`
}
messageText += `🌐 *Page : ${pageInput}/${totalPages}*
📊 *Total Users : ${totalItems}*`
const thumbnailUrl = "https://img93.pixhost.to/images/1285/565566923_izumizopedia.jpg"
const externalAdReply = {
title: "💎 𝙇𝙄𝙎𝙏 𝙐𝙎𝙀𝙍𝙎 & 𝙎𝙀𝙍𝙑𝙀𝙍𝙎",
body: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
thumbnailUrl: thumbnailUrl,
mediaType: 1,
sourceUrl: "https://instagram.com/naruyaizumi_",
renderLargerThumbnail: true,
}
await conn.sendMessage(m.chat, { text: messageText, contextInfo: { externalAdReply } }, { quoted: m })
} catch (error) {
console.error(error.message)
conn.sendMessage(m.chat, { text: "❌ *Terjadi kesalahan saat mengambil data.*" }, { quoted: m })
}
}

handler.help = ["listpanel"]
handler.tags = ["server"]
handler.command = /^(listpanel|lp)$/i
handler.premium = true

export default handler