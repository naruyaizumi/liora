
let handler = async (m, { text, usedPrefix }) => {
let salah = `*Pilihan Yang Tersedia:*\n\n*Gunting, Kertas, Batu*\n\n> *${usedPrefix}suit gunting*\n\n> *Kasih Spasi!*`
if (!text) return m.reply(salah)
var astro = Math.random()

if (astro < 0.34) {
astro = 'batu' 
} else if (astro > 0.34 && astro < 0.67) {
astro = 'gunting' 
} else {
astro = 'kertas'
}

//menentukan rules
if (text == astro) {
m.reply(`*Seri!*\n*kamu: ${text}*\n*Raiden: ${astro}*`)
} else if (text == 'batu') {
if (astro == 'gunting') {
global.db.data.users[m.sender].money += 100000
m.reply(`*Kamu Menang!\n+ Rp 100.000\n> *Kamu: ${text}*\n> *Raiden: ${astro}*`)
} else {
m.reply(`*Kamu Kalah!*\n> *Kamu: ${text}*\n> *Raiden: ${astro}*`)
}
} else if (text == 'gunting') {
if (astro == 'kertas') {
global.db.data.users[m.sender].money += 100000
m.reply(`*Kamu Menang!*\n*+ Rp 100.000\n> *Kamu: ${text}*\n> *Raiden: ${astro}*`)
} else {
m.reply(`*Kamu Kalah!*\n> *Kamu: ${text}*\n> *Raiden: ${astro}*`)
}
} else if (text == 'kertas') {
if (astro == 'batu') {
global.db.data.users[m.sender].money += 100000
m.reply(`*Kamu Menang!*\n*+ Rp 100.000*\n> *Kamu: ${text}*\n> *Raiden: ${astro}*`)
} else {
m.reply(`*Kamu Kalah!*\n> *Kamu: ${text}*\n> *Raiden: ${astro}*`)
}
} else {
m.reply(salah)
}
}
handler.help = ['suit']
handler.tags = ['fun']
handler.command = /^(suit)$/i
handler.register = true
export default handler 
