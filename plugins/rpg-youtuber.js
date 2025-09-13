
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.youtuber) ? user.youtuber = 0 : user.youtuber
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'youtuber'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `📹 *Misi kamu sebagai ${conn.misi[id][0]} masih berjalan~*\n💬 *Sabar dulu, lagi upload video...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 80000
let randomExp = Math.floor(Math.random() * 10) * 1500
let hsl = `
🎬 *𝗩𝗜𝗗𝗘𝗢 𝗦𝗘𝗟𝗘𝗦𝗔𝗜 𝗗𝗜𝗨𝗣𝗟𝗢𝗔𝗗!* 🎬
━━━━━━━━━━━━━━━━
📹 *Youtuber: ${name}*
💰 *Pendapatan Iklan: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📦 *Konten Selesai: +1*
🧾 *Total Video: ${toRupiah(order + 1)}
━━━━━━━━━━━━━━━━
🍓 *Kamu dapat banyak views dan like! Jangan lupa upload lagi yaa~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.youtuber += 1
setTimeout(() => {
m.reply('📸 *Mulai proses editing dan rendering video...*')
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
m.reply(`⏳ *Channel kamu masih dalam cooldown~*\n🕒 *Tunggu: ${timers} sebelum upload konten lagi yaa~*`)
}
}

handler.help = ["youtuber"]
handler.tags = ['rpg']
handler.command = /^(youtuber|konten|video)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.level = 12
handler.energy = 25

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