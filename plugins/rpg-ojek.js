
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.ojek) ? user.ojek = 0 : user.ojek
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'ojek'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `🛵 *Misi kamu sebagai ${conn.misi[id][0]} masih berjalan, sabar yaa~*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 80000
let randomExp = Math.floor(Math.random() * 10) * 800
let hsl = `
🛵 *𝗢𝗝𝗘𝗞 𝗢𝗡𝗟𝗜𝗡𝗘 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🛵
━━━━━━━━━━━━━━━━
👤 *Nama Driver: ${name}*
💰 *Uang Didapat: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📦 *Order Selesai: +1*
🧾 *Total Orderan: ${toRupiah(order + 1)}
━━━━━━━━━━━━━━━━
🍡 *Kamu berhasil antar penumpang ke tujuan dengan selamat~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.ojek += 1
setTimeout(() => {
m.reply('🛵 *Sedang mencari orderan di jalanan pedesaan... sabar yaa~*')
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
m.reply(`⏳ *Kamu masih capek habis narik~*\n🕒 *Tunggu ${timers} sebelum bisa ojek lagi yaa~*`)
}
}

handler.help = ["ojek"]
handler.tags = ['rpg']
handler.command = /^(ojek)$/i
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