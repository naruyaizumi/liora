
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.penyanyi) ? user.penyanyi = 0 : user.penyanyi
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'penyanyi'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `🎤 *Kamu masih manggung sayang, sabar dulu yaa...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 170000
let randomExp = Math.floor(Math.random() * 10) * 1200
let hsl = `
🎤 *𝗧𝗨𝗚𝗔𝗦 𝗣𝗘𝗡𝗬𝗔𝗡𝗚𝗜 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🎶
━━━━━━━━━━━━━━━━
👗 *Nama Artis: ${name}*
💰 *Fee Manggung: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📝 *Show Selesai: +1*
🧾 *Total Manggung: ${toRupiah(order + 1)}*
━━━━━━━━━━━━━━━━
🌸 *Penampilanmu memukau banget! Semua penonton terpukau dan kamu jadi trending topik~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.penyanyi += 1
setTimeout(() => {
m.reply('🎵 *Sedang manggung... semangat nyanyinya yaaa~*')
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
m.reply(`⏳ *Kamu baru selesai manggung nih...*\n🕒 *Tunggu: ${timers} sebelum manggung lagi yaa~*`)
}
}

handler.help = ['penyanyi']
handler.tags = ['rpg']
handler.command = /^(penyanyi)$/i
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