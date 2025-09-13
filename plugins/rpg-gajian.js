
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let last = user.lastclaim
let now = new Date * 1
let wait = 28800000
let time = wait - (now - last)
let hours = Math.floor(time / 3600000)
let minutes = Math.floor((time % 3600000) / 60000)
let seconds = Math.floor((time % 60000) / 1000)
if (now - last > wait) {
let gaji = Math.floor(Math.random() * 110000) + 10000
user.money += gaji
user.exp += 150
user.lastclaim = now
return m.reply(`🍓 *Gaji diterima!*\n*Kamu mendapatkan Rp ${gaji.toLocaleString()} dan +150 XP hari ini~*\n*Jangan lupa istirahat juga yaa~*`)
} else {
return m.reply(`🍡 *Kamu sudah gajian sayang!*\n⏳ *Tunggu ${hours} Jam ${minutes} Menit ${seconds} Detik* lagi buat gajian selanjutnya ya~*`)
}
}

handler.help = ['gajian']
handler.tags = ['rpg']
handler.command = /^(gaji|gajian)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler