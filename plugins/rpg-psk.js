
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.psk) ? user.psk = 0 : user.psk
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'psk'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `💋 *Kamu masih "ngeladenin" klien sebelumnya, sabar dulu ya...*`, m)
if (new Date - user.lastmisi > 3600000) {
let randomUang = Math.floor(Math.random() * 10) * 120000
let randomExp = Math.floor(Math.random() * 10) * 800
let hsl = `
💄 *𝗠𝗜𝗦𝗜 𝗣𝗘𝗞𝗘𝗥𝗝𝗔 𝗦𝗢𝗦𝗜𝗔𝗟* 💄
━━━━━━━━━━━━━━━━
🍓 *Nama Klien: ${name}*
💰 *Uang Tip: +Rp ${toRupiah(randomUang)}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Klien Dilayani: +1*
🗂️ *Total Layanan: ${toRupiah(order + 1)}
━━━━━━━━━━━━━━━━
🛏️ *Yahh... kerja kerasmu nggak sia-sia, walau harga diri sedikit terkikis~*
`.trim()
user.money += randomUang
user.exp += randomExp
user.psk += 1
setTimeout(() => {
m.reply('💄 *Kamu sedang "melayani" klien... sabar dulu yaa~*')
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
m.reply(`⏳ *Kamu butuh istirahat dulu ya~*\n🕒 *Tunggu: ${timers} sebelum ngeladenin klien lagi...*`)
}
}

handler.help = ["psk"]
handler.tags = ['rpg']
handler.command = /^(psk)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.level = 5
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