
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.vlog) ? user.vlog = 0 : user.vlog
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'vlog'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `📹 *Misi sebagai ${conn.misi[id][0]} masih berlangsung, sabar yaa...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 100000
let randomExp = Math.floor(Math.random() * 10) * 1200
let hsl = `
📸 *𝗠𝗜𝗦𝗜 𝗩𝗟𝗢𝗚𝗚𝗘𝗥 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🎬
━━━━━━━━━━━━━━━━
👤 *Konten Kreator: ${name}*
💰 *Adsense: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Upload Berhasil: +1*
🗂️ *Total Vlog: ${toRupiah(order + 1)}*
━━━━━━━━━━━━━━━━
🌸 *Konten kamu trending! Banyak yang suka sama vibes kamu~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.vlog += 1
setTimeout(() => {
m.reply('📹 *Sedang ngedit vlog dulu ya...*')
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
m.reply(`⏳ *Kamu baru upload konten yaa...*\n🕒 *Tunggu: ${timers} sebelum bisa bikin vlog baru~*`)
}
}

handler.help = ['vlog']
handler.tags = ['rpg']
handler.command = /^(vlog|vlogger)$/i
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