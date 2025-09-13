
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let __timers = (new Date - user.lastmisi)
let _timers = (3600000 - __timers)
let order = isNaN(user.penjudi) ? user.penjudi = 0 : user.penjudi
let timers = clockString(_timers)
let name = conn.getName(m.sender)
let id = m.sender
let kerja = 'penjudi'
conn.misi = conn.misi ? conn.misi : {}
if (id in conn.misi) return conn.reply(m.chat, `🎲 *Kamu masih di meja judi sayang, sabar dulu ya...*`, m)
if (new Date - user.lastmisi > 3600000) {
let hasilMenang = Math.random() < 0.6
let randomUang = Math.floor(Math.random() * 10) * (hasilMenang ? 150000 : -80000)
let randomExp = Math.floor(Math.random() * 10) * (hasilMenang ? 800 : 300)
let status = hasilMenang ? '🏆 *Kamu menang taruhan!*' : '💀 *Kamu kalah taruhan!*'
let uangDisplay = randomUang >= 0 ? `+Rp ${toRupiah(randomUang)}` : `-Rp ${toRupiah(Math.abs(randomUang))}`
let hsl = `
🎲 *𝗠𝗘𝗝𝗔 𝗧𝗔𝗥𝗨𝗛𝗔𝗡 𝗦𝗘𝗟𝗘𝗦𝗔𝗜!* 🎰
━━━━━━━━━━━━━━━━
🎭 *Nama: ${name}*
💰 *Uang: ${uangDisplay}*
✨ *Exp: +${toRupiah(randomExp)} exp*
📋 *Taruhan: +1*
🧾 *Total Judi: ${toRupiah(order + 1)}*
━━━━━━━━━━━━━━━━
${status}
`.trim()
user.money += randomUang
user.exp += randomExp
user.penjudi += 1
setTimeout(() => {
m.reply('🎰 *Sedang bermain di meja judi... semoga hoki yaa!*')
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
m.reply(`⏳ *Kamu baru selesai taruhan nih...*\n🕒 *Tunggu: ${timers} sebelum bisa berjudi lagi yaa~*`)
}
}

handler.help = ['penjudi']
handler.tags = ['rpg']
handler.command = /^(penjudi)$/i
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