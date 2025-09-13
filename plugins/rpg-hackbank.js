
let handler = async (m, { conn, usedPrefix, command, text }) => {
let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false
if (!who) return m.reply(`*Tag atau reply orang yang mau kamu bobol banknya yaa~* 🍓\n\n*Contoh: ${usedPrefix + command} @${m.sender.split('@')[0]}*`)
let user = global.db.data.users
if (!user[who]) return m.reply('*Orang itu belum terdaftar di database~* ✨')
if (user[who].bank < 1000000) return m.reply('*Uangnya di bank belum cukup buat dibobol...* 💸')
if (new Date - user[who].lockBankCD < 36000000) return m.reply(`*Bank-nya lagi terkunci nih, coba lagi ${getTime(36000000, user[who].lockBankCD)} lagi~* 🔒`)
if (new Date - user[m.sender].lasthackbank < 10800000) return conn.reply(m.chat, `*Kamu sudah bobol bank hari ini~* ✋\n*Cooldown: ${getTime(10800000, user[m.sender].lasthackbank)}*`, m)
if (user[m.sender].level < user[who].level) return m.reply('*Levelmu belum cukup tinggi untuk membobol bank mereka~* ⚠️')
let dapat = Math.floor(Math.random() * 1000000)
await conn.reply(m.chat, '⏳ *Mencoba masuk ke sistem bank...*\n*Tunggu sebentar yaa... ♡*', m)
await delay(5000)
user[who].bank -= dapat
user[m.sender].money += dapat
user[m.sender].lasthackbank = new Date() * 1
let caption = `
💻 *Sistem berhasil dibobol!*
👤 *Target: ${conn.getName(who)}*
💸 *Uang yang berhasil diambil:*
*Rp${toRupiah(dapat)} ${global.rpg.emoticon("money")}*

✨ *Selamat yaa~! Uangnya sudah masuk ke dompetmu!* 🍰
`.trim()
await conn.reply(m.chat, caption, m)
}
handler.help = ['hackbank']
handler.tags = ['rpg']
handler.command = /^(hackbank|hack)$/i
handler.register = true
handler.rpg = true
handler.group = true

export default handler

const delay = ms => new Promise(res => setTimeout(res, ms))

function getTime(cooldown, date) {
let sisa = cooldown - (new Date - date)
return clockString(sisa)
}

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