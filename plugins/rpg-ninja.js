
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.ninja) ? user.ninja = 0 : user.ninja
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'ninja'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `🥷 *Misi ninja kamu sebelumnya masih berjalan, sabar dulu~*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 150000
let randomExp = Math.floor(Math.random() * 10) * 1100
let hsl = `
🥷 *𝗠𝗜𝗦𝗜 𝗡𝗜𝗡𝗝𝗔 𝗦𝗘𝗟𝗘𝗦𝗔𝗜* 🥷
━━━━━━━━━━━━━━━━
🔎 *Nama Shinobi: ${name}*
💰 *Bayaran Misi: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Target Selesai: +1*
🗂️ *Total Misi Ninja: ${toRupiah(order + 1)}
━━━━━━━━━━━━━━━━
🍃 *Kamu telah menyelinap di balik kegelapan malam, membunuh tanpa jejak... seperti bayangan~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.ninja += 1
setTimeout(() => {
m.reply('🥷 *Kamu sedang menyusup dan mengeksekusi misi diam-diam... tunggu sebentar ya~*')
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
m.reply(`⏳ *Sabar, chakra-mu belum cukup~*\n🕒 *Tunggu: ${timers} sebelum menjalankan misi ninja lagi...*`)
}
}

handler.help = ["ninja"]
handler.tags = ['rpg']
handler.command = /^(ninja)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.level = 15
handler.energy = 35

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