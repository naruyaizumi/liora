
let handler = async (m, { conn }) => {
await global.loading(m, conn)
let message = `🎀 *Informasi API Key* 🌸
━━━━━━━━━━━━━━━━━━━
`
try {
let usernameLol = '-', requestsLol = '-', todayLol = '-', accountTypeLol = '-', expiredLol = '-'
try {
const responseLol = await fetch(global.API('lol', '/api/checkapikey', {}, 'apikey'))
if (!responseLol.ok) throw new Error(`Status: ${responseLol.status}`)
const jsonLol = await responseLol.json()
usernameLol = jsonLol.result.username
requestsLol = jsonLol.result.requests
todayLol = jsonLol.result.today
accountTypeLol = jsonLol.result.account_type
expiredLol = jsonLol.result.expired
} catch (e) {
message += `⚠️ *Gagal mengambil data dari API: ${e.message}*
`
}
message += `👤 *Username: ${usernameLol}*
📊 *Total Requests: ${requestsLol}*
📅 *Hari Ini: ${todayLol}*
💎 *Tipe Akun: ${accountTypeLol}*
📆 *Expired: ${expiredLol}*
━━━━━━━━━━━━━━━━━━━
`
let usernameBtz = '-', totalHit = '-', todayHit = '-', limit = '-', role = '-', expiredBtz = '-'
try {
const responseBtz = await fetch(global.API('btz', '/api/checkkey', {}, 'apikey'))
if (!responseBtz.ok) throw new Error(`Status: ${responseBtz.status}`)
const jsonBtz = await responseBtz.json()
usernameBtz = jsonBtz.result.username
totalHit = jsonBtz.result.totalHit
todayHit = jsonBtz.result.todayHit
limit = jsonBtz.result.limit
role = jsonBtz.result.role
expiredBtz = jsonBtz.result.expired
} catch (e) {
message += `⚠️ *Gagal mengambil data dari API: ${e.message}*
`
}
message += `👤 *Username: ${usernameBtz}*
📊 *Total Requests: ${totalHit}*
📅 *Hari Ini: ${todayHit}*
✨ *Limit: ${limit}*
💎 *Tipe Akun: ${role}*
📆 *Expired: ${expiredBtz}*
━━━━━━━━━━━━━━━━━━━
✨ *Gunakan API ini dengan bijak dan efisien!*`
await conn.sendMessage(m.chat, { text: message }, { quoted: m })
} catch (error) {
console.error('Error:', error)
m.reply(`❌ *Terjadi Kesalahan Teknis!*
⚠️ *Detail:* ${error.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['cekapikey']
handler.tags = ['info']
handler.command = /^(cekapikey|cekapi)$/i
handler.mods = true

export default handler