import { listPanelUsers } from "../../lib/server.js"

let handler = async (m, { conn, args, usedPrefix }) => {
const domain = global.config.domain
const apikey = global.config.apikey
const capikey = global.config.capikey
const pageInput = args[0] ? parseInt(args[0]) : 1
try {
const { users, serversByUser, totalItems, totalPages, page } = await listPanelUsers(domain, apikey, capikey, pageInput)
let sections = [
{
title: `🍰 *Pilih User & Server (Page ${page}/${totalPages})*`,
rows: []
}
]
for (let user of users) {
const u = user.attributes
const userServers = serversByUser[u.id] || []
if (userServers.length > 0) {
userServers.forEach((s, idx) => {
sections[0].rows.push({
title: `🍩 ${u.username} | Server ${idx + 1}`,
description: `🍰 Status: ${s.status} | 🍓 Suspended: ${s.suspended}`,
id: `${usedPrefix}detailserver ${u.id}.${s.id}`
})
})
} else {
sections[0].rows.push({
title: `🍩 ${u.username} | No Server`,
description: `🍓 Tidak ada server aktif`,
id: `${usedPrefix}detailserver ${u.id}`
})
}
}
await conn.sendMessage(m.chat, {
text: `🍬 *Daftar User & Server (Page ${page}/${totalPages})*`,
footer: `🍰 Total Users: ${totalItems}`,
title: "🍪 List Panel",
interactiveButtons: [
{
name: "single_select",
buttonParamsJson: JSON.stringify({
title: "🍓 Klik untuk memilih",
sections
})
}
],
hasMediaAttachment: false
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ ${e.message}`)
}
}

handler.help = ["listpanel"]
handler.tags = ["server"]
handler.command = /^(listpanel|lp)$/i
handler.premium = true

export default handler