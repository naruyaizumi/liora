
const xpperlimit = 1

let handler = async (m, { conn, args }) => {
let user = global.db.data.users[m.sender]
if (!user) return
if (typeof user.money !== 'number') user.money = 0
if (typeof user.bank !== 'number') user.bank = 0

let count = args[0]
count = /all/i.test(count) ? Math.floor(user.bank / xpperlimit) : parseInt(count)
if (isNaN(count) || count <= 0) count = 1
if (user.atm == 0) return m.reply('💳 *Kamu belum punya ATM yaa~*\n✨ *Yuk craft dulu pakai .craft atm biar bisa tarik tunai cantik~!*')

if (user.bank >= count * xpperlimit) {
user.bank -= count * xpperlimit
user.money += count
conn.reply(m.chat, `🍬 *Berhasil menarik Rp${toRupiah(count)} dari bank!* 💸\n*Jangan boros yaa, hemat itu manis~*`, m)
} else {
conn.reply(m.chat, `⚠️ *Uang di bank nggak cukup untuk ditarik sebesar Rp${toRupiah(count)}*\n*Coba dicek lagi yaa, semangat cari cuan!* 💖`, m)
}
}

handler.help = ['tarik']
handler.tags = ['rpg']
handler.command = /^tarik([0-9]+)?|tarik|tarikall$/i
handler.group = true
handler.rpg = true
handler.register = true

export default handler

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}