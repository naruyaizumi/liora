import { canLevelUp, xpRange } from '../lib/levelling.js'
import { Rank } from 'day-canvas'

let handler = async (m, { conn }) => {
try {
let user = global.db.data.users
if (!canLevelUp(user[m.sender].level, user[m.sender].exp, xpNeeded(user[m.sender].level))) {
let { min, xp, max } = xpRange(user[m.sender].level, xpNeeded(user[m.sender].level))
return m.reply(`
🎀 *𝐏𝐑𝐎𝐆𝐑𝐄𝐒 𝐋𝐄𝐕𝐄𝐋!* 🎀
────────────────────
🌸 *Level: ${user[m.sender].level}*
💫 *XP: ${Math.max(0, user[m.sender].exp - min)} / ${xp} (kurang ${Math.max(0, max - user[m.sender].exp)})*
❤️ *Darah: ${user[m.sender].health}*
⚡ *Energi: ${user[m.sender].energy}*
────────────────────
📌 *Semakin aktif, semakin tinggi levelnya!*
🌷 *Terima kasih sudah bermain bersama Crystalia~!*
`.trim())
}
await global.loading(m, conn)
let before = user[m.sender].level * 1
while (canLevelUp(user[m.sender].level, user[m.sender].exp, xpNeeded(user[m.sender].level))) user[m.sender].level++
if (before !== user[m.sender].level) {
let healthBefore = user[m.sender].health
let energyBefore = user[m.sender].energy
let level = user[m.sender].level
let maxHealth = 100 + level * 10
let maxEnergy = 50 + level * 5
user[m.sender].health = maxHealth
user[m.sender].energy = maxEnergy
let member = Object.keys(user).filter(v => user[v].level > 0).sort((a, b) => user[b].level - user[a].level)
let { min, xp, max } = xpRange(level, xpNeeded(level))
let pp = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://cloudkuimages.guru/uploads/images/wTGHCxNj.jpg')
const name = user[m.sender].registered ? user[m.sender].name : await conn.getName(m.sender)
let str = `
🎀 *𝐋𝐄𝐕𝐄𝐋 𝐔𝐏!* 🎀
────────────────────
🍓 *Nama: ${name}*
🌸 *Level: ${before} ➜ ${level}*
💫 *Role: ${user[m.sender].role}*
❤️ *Darah: ${healthBefore} ➜ ${maxHealth} (tersisa ${user[m.sender].health})*
⚡ *Energi: ${energyBefore} ➜ ${maxEnergy} (tersisa ${user[m.sender].energy})*
────────────────────
📌 *Semakin aktif, semakin tinggi levelnya!*
🌷 *Terima kasih sudah bermain bersama Crystalia~!*
`.trim()
try {
let currentXp = Math.max(0, user[m.sender].exp - min)
let img = await canvasRank(pp, name, "online", level, member.indexOf(m.sender), currentXp, xp)
await conn.sendFile(m.chat, img, 'levelup.jpg', str, m)
} catch (e) {
let currentXp = Math.max(0, user[m.sender].exp - min)
let img = await canvasRank(pp, name, "online", level, member.indexOf(m.sender), currentXp, xp)
await conn.sendFile(m.chat, img, 'levelup.jpg', str, m)
}
}
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['levelup']
handler.tags = ['xp']
handler.command = /^level(|up)$/i

export default handler

export function xpNeeded(level) {
return xpRange(level).xp
}

async function canvasRank(avatar, username, status, level, rank, cxp, rxp) {
const background = [
'https://cloudkuimages.guru/uploads/images/BEtWe2PL.jpg',
'https://cloudkuimages.guru/uploads/images/luUB5CFd.jpg',
'https://cloudkuimages.guru/uploads/images/AJ0vCNdS.jpg',
'https://cloudkuimages.guru/uploads/images/NnXbWf3T.jpg',
'https://cloudkuimages.guru/uploads/images/MJCVh29a.jpg',
'https://cloudkuimages.guru/uploads/images/E7U3vuhc.jpg',
'https://cloudkuimages.guru/uploads/images/G1HOQXsi.jpg',
'https://cloudkuimages.guru/uploads/images/tGMXCRNO.jpg',
'https://cloudkuimages.guru/uploads/images/YrqmiNRZ.jpg',
'https://cloudkuimages.guru/uploads/images/cBjwWlK9.jpg',
'https://cloudkuimages.guru/uploads/images/zUe9nkQD.jpg'
]
const rankBuffer = await new Rank()
.setAvatar(avatar)
.setBackground("image", background.getRandom())
.setUsername(username)
.setBorder("#000000")
.setBarColor("#FFFFFF")
.setStatus("online")
.setLevel(level)
.setRank(rank)
.setCurrentXp(cxp)
.setRequiredXp(rxp)
.build()
return rankBuffer
}