
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.hacker) ? user.hacker = 0 : user.hacker
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'hacker'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `💻 *Misi kamu sebagai ${conn.misi[id][0]} masih berlangsung~*\n⏳ *Sabar ya, sistem masih diretas...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 160000
let randomExp = Math.floor(Math.random() * 10) * 1500
let hsl = `
🖥️ *𝗠𝗜𝗦𝗜 𝗛𝗔𝗖𝗞𝗘𝗥 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🖥️
━━━━━━━━━━━━━━━━
👨‍💻 *Hacker: ${name}*
💰 *Hasil Retas: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Target Diretas: +1*
🗂️ *Total Retasan: ${toRupiah(order + 1)}
━━━━━━━━━━━━━━━━
🌐 *Kamu berhasil meretas server target dan mendapatkan hadiah besar!*
`.trim()
user.money += randomUang
user.exp += randomExp
user.hacker += 1
setTimeout(() => {
m.reply('💻 *Meretas sistem... Bypass firewall... akses masuk...*')
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
m.reply(`⏳ *Kamu sudah menyelesaikan operasi terakhir~*\n🕒 *Tunggu: ${timers} sebelum meretas lagi ya...*`)
}
}

handler.help = ["hacker"]
handler.tags = ['rpg']
handler.command = /^(hacker)$/i
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