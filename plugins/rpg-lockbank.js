
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
if (!user.atm || user.atm < 1)
return m.reply(`🍩 *Kamu belum punya ATM loh sayang~*\n\n📦 *Silakan craft dulu ATM-nya biar bisa pakai fitur bank~*\n*Gunakan perintah: .craft atm*`)
let level = Math.min(user.atm, 10)
let duration = level * 3600000
let cooldown = user.lockBankCD || 0
if (new Date - cooldown < duration)
return m.reply(`🍬 *Bank kamu masih terkunci selama ${getTime(duration, cooldown)} lagi yaa~*`)
user.lockBankCD = new Date() * 1
m.reply(`🧁 *Bank kamu berhasil dikunci selama ${level} jam!*\n🍓 *Semua uang di bank sekarang aman dan tidak bisa dicuri oleh hacker yaa~*`)
}

handler.help = ['lockbank']
handler.tags = ['rpg']
handler.command = /^(lock|lockbank)$/i
handler.rpg = true
handler.group = true
handler.limit = true

export default handler

function getTime(cooldown, date) {
let elapsed = new Date - date
let remaining = cooldown - elapsed
return clockString(remaining)
}

function clockString(ms) {
let y = Math.floor(ms / 31536000000)
let d = Math.floor(ms / 86400000) % 365
let h = Math.floor(ms / 3600000) % 24
let m = Math.floor(ms / 60000) % 60
let s = Math.floor(ms / 1000) % 60
return [
y ? `🍰 ${y} Tahun` : '',
d ? `🍪 ${d} Hari` : '',
h ? `🍡 ${h} Jam` : '',
m ? `🍭 ${m} Menit` : '',
s ? `🍫 ${s} Detik` : ''
].filter(Boolean).join(' ')
}