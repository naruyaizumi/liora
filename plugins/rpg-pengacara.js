
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.pengacara) ? user.pengacara = 0 : user.pengacara
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'pengacara'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `⚖️ *Misi sebagai ${conn.misi[id][0]} masih berjalan, sabar yaa...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 200000
let randomExp = Math.floor(Math.random() * 10) * 1500
let hsl = `
⚖️ *𝗠𝗜𝗦𝗜 𝗣𝗘𝗡𝗚𝗔𝗖𝗔𝗥𝗔 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 👩‍⚖️
━━━━━━━━━━━━━━━━
👔 *Nama: ${name}*
💰 *Honor: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Kasus Ditangani: +1*
🗂️ *Total Klien: ${toRupiah(order + 1)}*
━━━━━━━━━━━━━━━━
🌸 *Kamu berhasil memenangkan kasus di pengadilan~ Klienmu berterima kasih!*
`.trim()
user.money += randomUang
user.exp += randomExp
user.pengacara += 1
setTimeout(() => {
m.reply('⚖️ *Sedang menyiapkan berkas sidang...*')
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
m.reply(`⏳ *Kamu baru menangani kasus yaa...*\n🕒 *Tunggu: ${timers} sebelum siap sidang lagi~*`)
}
}

handler.help = ['pengacara']
handler.tags = ['rpg']
handler.command = /^(pengacara)$/i
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