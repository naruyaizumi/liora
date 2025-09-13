
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let cooldown = 3600000
let sisa = cooldown - (new Date - user.lastclaim)
if (sisa > 0) {
let timers = clockString(sisa)
return conn.reply(m.chat, `🍩 *Upss, kamu udah klaim tadi sayang~*\n⏳ *Tunggu ${timers} lagi buat klaim ulang yaa~*`, m)
}
user.money += 1000
user.potion += 1
user.lastclaim = new Date * 1
conn.reply(m.chat, `🍓 *Klaim Bonus 1 Jam!* 🍓
────────────────────────────
🍬 *Uang: +Rp ${toRupiah(1000)}*
🧃 *Potion: +1*
────────────────────────────
💌 *Klaim lagi setelah 1 jam yaa, semangat farming nyaaa~!*`, m)
}

handler.help = ['collect']
handler.tags = ['rpg']
handler.command = /^(collect|claim)$/i
handler.register = true
handler.group = true
handler.rpg = true

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