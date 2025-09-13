
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.spy) ? user.spy = 0 : user.spy
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'spy'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `🕵️‍♂️ *Misi kamu sebagai ${conn.misi[id][0]} masih berlangsung, sabar yaa...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 200000
let randomExp = Math.floor(Math.random() * 10) * 1500
let hsl = `
🕶️ *𝗠𝗜𝗦𝗜 𝗦𝗣𝗬 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🕵️‍♀️
━━━━━━━━━━━━━━━━
🔍 *Agen: ${name}*
💰 *Bayaran Misi: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Operasi Rahasia: +1*
🗂️ *Total Misi Spy: ${toRupiah(order + 1)}*
━━━━━━━━━━━━━━━━
🌸 *Misi selesai tanpa jejak... Kamu mata-mata handal banget sayang~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.spy += 1
setTimeout(() => {
m.reply('🕶️ *Menjalankan operasi rahasia...*')
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
m.reply(`⏳ *Operasi masih diselidiki sayang...*\n🕒 *Tunggu: ${timers} sebelum kamu bisa menjadi agen lagi~*`)
}
}

handler.help = ['spy']
handler.tags = ['rpg']
handler.command = /^(spy)$/i
handler.register = true
handler.group = true
handler.rpg = true
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