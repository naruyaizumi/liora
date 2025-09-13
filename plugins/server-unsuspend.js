let handler = async (m, { args, conn }) => {
const domain = global.config.domain
const apikey = global.config.apikey
const unsuspendAll = args[0] === "all"
try {
if (unsuspendAll) {
const serversResponse = await fetch(`${domain}/api/application/servers`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`
}
})
const serversRes = await serversResponse.json()
if (!serversResponse.ok || serversRes.errors) throw new Error(serversRes.errors ? serversRes.errors[0].detail : "Gagal mengambil daftar server.")
const suspendedServers = serversRes.data.filter(server => server.attributes.suspended)
if (suspendedServers.length === 0) return conn.sendMessage(m.chat, { text: "🍃 *Tidak ada server yang perlu di-unsuspend!*" }, { quoted: m })
let reportText = "📋 *`𝙐𝙉𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝙍𝙀𝙋𝙊𝙍𝙏 - 𝘼𝙇𝙇`* 📋\n"
let countSuccess = 0
let countFailed = 0
for (const server of suspendedServers) {
const unsuspendResponse = await fetch(`${domain}/api/application/servers/${server.attributes.id}/unsuspend`, {
method: "POST",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`
}
})
if (unsuspendResponse.ok) {
reportText += `🍃 *${server.attributes.name} ID: ${server.attributes.id} - UNSUSPENDED*\n`
countSuccess++
} else {
reportText += `🍂 *${server.attributes.name} ID: ${server.attributes.id} - FAILED*\n`
countFailed++
}
}
const externalAdReply = {
title: "🌍 𝙐𝙉𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝘼𝙇𝙇 𝙎𝙀𝙍𝙑𝙀𝙍𝙎",
body: `📌 ${countSuccess} UNSUSPENDED || 🍂 ${countFailed} FAILED`,
thumbnailUrl: "https://files.catbox.moe/l0c3c2.jpg",
mediaType: 1,
renderLargerThumbnail: true
}
return conn.sendMessage(m.chat, { text: reportText, contextInfo: { externalAdReply } }, { quoted: m })
}
const srv = args[0]
if (!srv) return conn.sendMessage(m.chat, { text: "❌ *Mohon masukkan ID Server yang valid!*" }, { quoted: m })
const serverResponse = await fetch(`${domain}/api/application/servers/${srv}`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`
}
})
const serverData = await serverResponse.json()
if (!serverResponse.ok || serverData.errors) throw new Error(serverData.errors[0].detail || "*Server tidak ditemukan.*")
const serverName = serverData.attributes.name || "-"
if (!serverData.attributes.suspended) return conn.sendMessage(m.chat, { text: `✅ *Server dengan ID ${srv} sudah dalam keadaan aktif.*` }, { quoted: m })
const unsuspendResponse = await fetch(`${domain}/api/application/servers/${srv}/unsuspend`, {
method: "POST",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`
}
})
let reportText = `📋 *\`𝙐𝙉𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝙍𝙀𝙋𝙊𝙍𝙏 - 𝙄𝘿\`* 📋\n\n🚀 *Server Name:* ${serverName}\n📡 *Server ID:* ${srv}\n`
reportText += unsuspendResponse.ok ? "🍃 *Status: UNSUSPENDED*\n*Server berhasil di-unsuspend.*" : "🍂 *Status: FAILED*\n*Gagal unsuspend server.*"
const externalAdReply = {
title: "🚀 𝙐𝙉𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝙎𝙀𝙍𝙑𝙀𝙍 𝙄𝘿",
body: `📡 Server: ${serverName} || ID: ${srv}`,
thumbnailUrl: "https://files.catbox.moe/l0c3c2.jpg",
mediaType: 1,
renderLargerThumbnail: true
}
return conn.sendMessage(m.chat, { text: reportText, contextInfo: { externalAdReply } }, { quoted: m })
} catch (error) {
console.error(error)
conn.sendMessage(m.chat, { text: `❌ *Terjadi kesalahan: ${error.message}*` }, { quoted: m })
}
}

handler.help = ["unsuspend"]
handler.tags = ["server"]
handler.command = /^(unsuspend|us)$/i
handler.owner = true

export default handler