
let handler = async (m, { conn }) => {
if (new Date - global.db.data.users[m.sender].lastlatihan > 86400000) {
global.db.data.users[m.sender].limit += 10
global.db.data.users[m.sender].lastlatihan = new Date * 1
m.reply('🍓 *Kamu selesai berlatih hari ini!*\n✨ *Limit bertambah +10 sebagai hasil dari kerja kerasmu!*')
} else m.reply('🍡 *Kamu sudah latihan hari ini, istirahat dulu yaa~*\n⏳ *Coba lagi besok untuk dapat limit baru!*')
}

handler.help = ['latihan']
handler.tags = ['rpg']
handler.command = /^latihan$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler