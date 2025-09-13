
let handler = async (m, { conn, usedPrefix }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let timers = clockString(_timers)
let name = user.registered ? user.name : conn.getName(m.sender)
let id = m.sender
let kerja = 'roket'
conn.misi = conn.misi || {}
if (id in conn.misi) return conn.reply(m.chat, `✈️ *Misi '${conn.misi[id][0]}' kamu masih berlangsung, sabar yaa~*`, m)
if (user.energy < 80) return m.reply(`💉 *Kamu butuh minimal 80 health untuk terbang ke luar angkasa~*`)
if (__timers < 3600000) return m.reply(`⏳ *Tunggu ${timers} sebelum bisa menerbangkan roket lagi, yaa~*`)
let uang = Math.floor(Math.random() * 10) * 100000
let exp = Math.floor(Math.random() * 10) * 1000
let total = isNaN(user.roket) ? user.roket = 1 : user.roket
user.money += uang
user.exp += exp
user.roket += 1
user.energy -= 80
user.lastmisi = new Date * 1
conn.misi[id] = [
kerja,
setTimeout(() => delete conn.misi[id], 27000)
]
setTimeout(() => {
conn.reply(m.chat, `🚀 *${name} sedang bersiap meluncur ke luar angkasa...*`, m)
}, 0)
setTimeout(() => {
let hasil = `
🌠 *𝗠𝗜𝗦𝗜 𝗡𝗚𝗥𝗢𝗞𝗘𝗧 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟* 🌠
────────────────────
✨ *Nama: ${name}*
🌌 *Lokasi: Orbit ke-🌕*
💸 *Uang: +Rp ${toRupiah(uang)}*
📈 *Exp: +${toRupiah(exp)}*
🛰️ *Pendaratan: +1 Misi*
📦 *Total Penerbangan: ${toRupiah(total)}*
────────────────────
🔋 *Energi digunakan: -80*
🌷 *Terus menjelajah bintang, Captain ${name}~!*
`.trim()
conn.reply(m.chat, hasil, m)
}, 27000)
}

handler.help = ['roket']
handler.tags = ['rpg']
handler.command = /^(roket|ngroket|groket|jadiroket)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.level = 30

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