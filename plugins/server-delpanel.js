let handler = async (m, { args, conn }) => {
const domain = global.config.domain
const apikey = global.config.apikey
const userId = args[0]
if (!userId) return m.reply("❌ *Mohon masukkan User ID!*")
try {
const userResponse = await fetch(`${domain}/api/application/users/${userId}`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`,
},
})
if (!userResponse.ok) throw new Error("❌ *User tidak ditemukan atau telah dihapus sebelumnya!*")
const userData = await userResponse.json()
let serversToDelete = []
let currentPage = 1
let totalPages = 1
do {
const response = await fetch(`${domain}/api/application/servers?page=${currentPage}`, {
method: "GET",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`,
},
})
const data = await response.json()
if (data.errors) throw new Error(data.errors[0].detail || "Error fetching servers")
if (data.data && data.data.length > 0) {
const userServers = data.data.filter(server => server.attributes.user === parseInt(userId))
serversToDelete.push(...userServers)
}
currentPage++
totalPages = data.meta.pagination.total_pages
} while (currentPage <= totalPages)
for (let server of serversToDelete) {
await fetch(`${domain}/api/application/servers/${server.attributes.id}`, {
method: "DELETE",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`,
},
})
}
const deleteUserResponse = await fetch(`${domain}/api/application/users/${userId}`, {
method: "DELETE",
headers: {
Accept: "application/json",
"Content-Type": "application/json",
Authorization: `Bearer ${apikey}`,
},
})
if (!deleteUserResponse.ok) throw new Error(`❌ *Gagal menghapus User ID: ${userId}!*`)
await conn.sendMessage(m.chat, {
text: `🌸 *User ID: ${userId} berhasil dihapus dari panel!*`
}, { quoted: m })
} catch (error) {
console.error(error.message)
m.reply(`❌ *Terjadi kesalahan: ${error.message}*`)
}
}

handler.help = ["deletepanel"]
handler.tags = ["server"]
handler.command = /^(deletepanel|dp)$/i
handler.owner = true

export default handler