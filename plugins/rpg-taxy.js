
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.taxy) ? user.taxy = 0 : user.taxy
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'taxy'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `⏳ *Kamu masih ngerjain misi ${conn.misi[id][0]} loh, tunggu selesai dulu ya~*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 1000000)
let randomExp = Math.floor(Math.random() * 10000)
let hsl = `
🍭 *𝗠𝗜𝗦𝗜 𝗧𝗔𝗫𝗬 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🍭
━━━━━━━━━━━━━━━━
🚕 *Pekerja: ${name}*
💸 *Pendapatan: +Rp ${toRupiah(randomUang)}*
✨ *Exp Diterima: +${toRupiah(randomExp)} exp*
🧺 *Order Selesai: +1*
📊 *Total Order: ${toRupiah(order + 1)}*
━━━━━━━━━━━━━━━━
💡 *Jangan lupa istirahat dan minum air putih ya, pejuang cuan!*`.trim()
user.money += randomUang
user.exp += randomExp
user.taxy += 1

setTimeout(() => m.reply('🧭 *Mencari penumpang... tunggu sebentar ya~*'), 0)
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
m.reply(`⏳ *Kamu masih capek sayang~*\n\n🕒 *Waktu tunggu: ${timers}*\n🚕 *Ayo istirahat sebentar sebelum narik lagi~*`)
}
}

handler.help = ['taxy']
handler.tags = ['rpg']
handler.command = /^(taxy)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.energy = 20

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