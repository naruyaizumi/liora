
let handler = async (m, { conn, text, usedPrefix, command }) => {
let users = global.db.data.users
let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false
if (!who) return m.reply('🌸 *Tag atau reply orang yang mau kamu eliminasi dong, sayang~*')
if (!users[who]) return m.reply('💔 *Orangnya nggak terdaftar di database, coba cari target lain~*')
if (who === m.sender) return m.reply('😵 *Kamu gak bisa bunuh diri dong, kasihan kamu sendiri!*')
let pembunuh = users[m.sender]
let target = users[who]
if (pembunuh.level <= target.level) return m.reply(`🚫 *Level kamu harus lebih tinggi dari ${await conn.getName(who)} (${target.level}) untuk bisa membunuhnya!*`)
let __timers = (new Date - pembunuh.lastsda)
let _timers = (3600000 - __timers)
let timers = clockString(_timers)
if (__timers < 3600000) return m.reply(`⏳ *Sabar ya sayang~*\n*Tunggu ${timers} sebelum bisa membunuh lagi*`)
let levelGap = pembunuh.level - target.level
let baseSteal = Math.floor((levelGap / 100) * target.money)
if (baseSteal < 5000) baseSteal = 5000
if (baseSteal > target.money) baseSteal = target.money
let damage = Math.floor((levelGap / 2) + 10)
if (damage > target.health) damage = target.health
target.money -= baseSteal
target.health -= damage
pembunuh.money += baseSteal
pembunuh.lastsda = new Date * 1
let hasil = `
✧ 𝐀𝐒𝐒𝐀𝐒𝐒𝐈𝐍 𝐌𝐈𝐒𝐒𝐈𝐎𝐍 ✧
━━━━━━━━━━━━━━━━━━
🔪 *Target: @${who.split("@")[0]}*
🎯 *Level Target: ${target.level}*
❤️ *HP Berkurang: -${damage}*
💰 *Uang Dirampas: +Rp ${toRupiah(baseSteal)}*
━━━━━━━━━━━━━━━━━━
📌 *Semakin tinggi levelmu, semakin besar hasil rampasanmu!*
🌷 *Tapi hati-hati, target kuat bisa melawan balik lho~*
`.trim()
await conn.reply(m.chat, hasil, m, { mentions: [who] })
}
handler.help = ['membunuh']
handler.tags = ['rpg']
handler.command = /^(membunuh)$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler

function clockString(ms) {
let h = Math.floor(ms / 3600000)
let m = Math.floor(ms / 60000) % 60
let s = Math.floor(ms / 1000) % 60
return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}