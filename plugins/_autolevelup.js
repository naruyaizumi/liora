import { canLevelUp, xpRange } from '../lib/levelling.js'
import { Rank } from 'day-canvas'

export async function before(m) {
let users = global.db.data.users
let user = users[m.sender]
if (!user || !user.registered) return
let chat = global.db.data.chats[m.chat]
let setting = global.db.data.settings[this.user.jid]
let member = Object.keys(users).filter(v => users[v].level > 0).sort((a, b) => users[b].level - users[a].level)
let { min, xp, max } = xpRange(user.level, xpNeeded(user.level))
let pp = await this.profilePictureUrl(m.sender, 'image').catch(_ => 'https://cloudkuimages.guru/uploads/images/wTGHCxNj.jpg')
const name = user.registered ? user.name : await this.getName(m.sender)
if (m.isBaileys || m.fromMe) return
if (chat?.mute || chat?.isBanned || user?.banned) return
if (/^[=>.#\/!\\]/.test(m.text)) return
if (chat?.autolevelup || user?.autolevelup) {
if (canLevelUp(user.level, user.exp, xpNeeded(user.level))) {
let before = user.level
while (canLevelUp(user.level, user.exp, xpNeeded(user.level))) user.level++
if (before !== user[m.sender].level) {
let healthBefore = user[m.sender].health
let energyBefore = user[m.sender].energy
let maxHealth = 100 + user[m.sender].level * 10
let maxEnergy = 50 + user[m.sender].level * 5
user[m.sender].health = maxHealth
user[m.sender].energy = maxEnergy
let str = `
🎀 *𝐋𝐄𝐕𝐄𝐋 𝐔𝐏!* 🎀
────────────────────
🍓 *Nama: ${name}*
🌸 *Level: ${before} ➜ ${user[m.sender].level}*
💫 *Role: ${user[m.sender].role}*
❤️ *Darah: ${healthBefore} ➜ ${maxHealth} (tersisa ${user[m.sender].health})*
⚡ *Energi: ${energyBefore} ➜ ${maxEnergy} (tersisa ${user[m.sender].energy})*
────────────────────
📌 *Semakin aktif, semakin tinggi levelnya!*
🌷 *Terima kasih sudah bermain bersama Crystalia~!*
`.trim()
let currentXp = Math.max(0, user[m.sender].exp - min)
let img = await canvasRank(pp, name, "online", user[m.sender].level, member.indexOf(m.sender), currentXp, xp)
await this.sendMessage(m.chat, { image: img, caption: str }, { quoted: m })
}
}
return !0
}
return !0
}

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
.setRank(rank + 1)
.setCurrentXp(cxp)
.setRequiredXp(rxp)
.build()
return rankBuffer
}