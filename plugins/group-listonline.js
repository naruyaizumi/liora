
import { parsePhoneNumber } from 'awesome-phonenumber'

let handler = async (m, { conn }) => {
const chatID = m.chat
try {
const groupData = await conn.groupMetadata(chatID)
const groupName = groupData.subject || "Grup Ini"
const membersInfo = []
for (const member of groupData.participants) {
if (!member.id.includes('@s.whatsapp.net')) continue
const userJid = member.id
const userNumber = '+' + userJid.split('@')[0]
const userData = global.db.data.users[userJid]
const lastSeen = userData?.lastseen || 0
const isOnline = (Date.now() - lastSeen) < 3600000
const status = isOnline ? '🟢 Online' : '🔴 Offline'
let country = 'Tidak diketahui'
try {
let parsed = parsePhoneNumber(userNumber)
if (parsed.valid) {
country = new Intl.DisplayNames(['id'], { type: 'region' }).of(parsed.regionCode) || 'Tidak diketahui'
}
} catch (e) {
country = 'Tidak diketahui'
}
membersInfo.push(`🫧 *${await conn.getName(userJid)}*\n📡 *Status: ${status}*\n🌍 *Negara: ${country}*\n🔗 *wa.me/${userNumber.replace('+', '')}*`)
}
if (membersInfo.length > 0) {
const listText = membersInfo.join('\n\n')
m.reply(`📢 *Daftar Anggota Grup:*\n*${groupName}*\n\n${listText}`)
} else {
m.reply(`🚫 *Tidak ada anggota dalam grup ini.*`)
}
} catch (error) {
console.error(error)
m.reply("❌ *Gagal mengambil daftar anggota!*")
}
}

handler.help = ['listonline']
handler.tags = ['group']
handler.command = /^(listonline)$/i
handler.owner = true
handler.group = true

export default handler