
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.pilot) ? user.pilot = 0 : user.pilot
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'pilot'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `✈️ *Misi kamu sebagai ${conn.misi[id][0]} masih berjalan~*\n🛫 *Sabar ya, pesawat masih dalam penerbangan...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 120000
let randomExp = Math.floor(Math.random() * 10) * 1700
let hsl = `
🛬 *𝗣𝗘𝗡𝗘𝗥𝗕𝗔𝗡𝗚𝗔𝗡 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🛬
━━━━━━━━━━━━━━━━
👨‍✈️ *Pilot: ${name}*
💰 *Gaji Terbang: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Penerbangan Selesai: +1*
🗂️ *Total Terbang: ${toRupiah(order + 1)}
━━━━━━━━━━━━━━━━
🌤️ *Penerbangan berjalan lancar! Penumpang senang dan kamu makin berpengalaman~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.pilot += 1
setTimeout(() => {
m.reply('🛫 *Sedang menjalankan penerbangan lintas negara...*')
}, 0)
conn.misi[id] = [
kerja,
setTimeout(() => {
delete conn.misi[id]
}, 27000)
]
setTimeout(() => {
m.reply(hsl)
}, 27000)
user.lastmisi = new Date * 1
} else {
m.reply(`⏳ *Sabar ya, penerbangan baru saja selesai~*\n🕒 *Tunggu: ${timers} sebelum bisa terbang lagi~*`)
}
}

handler.help = ["pilot"]
handler.tags = ['rpg']
handler.command = /^(pilot|terbang|penerbangan)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.level = 15
handler.energy = 30

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