
import fs from 'fs'

let handler = async (m, { conn }) => {
let chatID = m.chat
try {
let groupData = await conn.groupMetadata(chatID)
let groupName = groupData.subject || "Grup Ini"
let regionData = JSON.parse(fs.readFileSync('./json/region.json', 'utf-8'))
let membersInfo = []
for (let member of groupData.participants) {
if (!member.id.includes('@s.whatsapp.net')) continue
let userJid = member.id
let userNumber = userJid.split('@')[0]
let name = await conn.getName(userJid)
let bio = (await conn.fetchStatus(userJid).catch(() => null))?.status || "Tidak ada bio"
let possibleCodes = [userNumber.slice(0, 3), userNumber.slice(0, 2), userNumber.slice(0, 1)]
let countryCode = possibleCodes.find(code => regionData[code]) || "Tidak diketahui"
let country = regionData[countryCode] || "Tidak diketahui"
membersInfo.push(`🪷 *${name}*\n📝 *Bio: ${bio}*\n🌍 *Negara: ${country}*\n🔗 *wa.me/${userNumber}*`)
}
if (membersInfo.length > 0) {
let listText = membersInfo.join('\n\n')
m.reply(`📋 *Daftar Anggota Grup: ${groupName}*\n\n${listText}`)
} else {
m.reply(`🚫 *Tidak ada anggota dalam grup ini.*`)
}
} catch (e) {
console.error(e)
m.reply("❌ *Gagal mengambil daftar anggota!*")
}
}

handler.help = ['listmember']
handler.tags = ['group']
handler.command = /^(listmember|member)$/i
handler.group = true
handler.owner = true

export default handler