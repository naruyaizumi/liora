
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.guru) ? user.guru = 0 : user.guru
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'guru'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `📚 *Misi kamu sebagai ${conn.misi[id][0]} masih berjalan~*\n📝 *Sabar ya, kelas belum selesai~*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 110000
let randomExp = Math.floor(Math.random() * 10) * 1300
let hsl = `
🏫 *𝗠𝗜𝗦𝗜 𝗠𝗘𝗡𝗚𝗔𝗝𝗔𝗥 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🏫
━━━━━━━━━━━━━━━━
👩‍🏫 *Guru: ${name}*
💰 *Honor Mengajar: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Kelas Selesai: +1*
🗂️ *Total Mengajar: ${toRupiah(order + 1)}
━━━━━━━━━━━━━━━━
🌸 *Anak-anak senang belajar hari ini! Kamu makin dihormati~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.guru += 1
setTimeout(() => {
m.reply('📖 *Sedang mengajar... membuka lembaran ilmu bersama siswa-siswi~*')
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
m.reply(`⏳ *Sabar ya, kelas barusan selesai~*\n🕒 *Tunggu: ${timers} sebelum bisa mengajar lagi~*`)
}
}

handler.help = ["guru"]
handler.tags = ['rpg']
handler.command = /^(guru)$/i
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