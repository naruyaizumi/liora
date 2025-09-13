
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let total = user.pisang + user.anggur + user.mangga + user.jeruk + user.apel
let text = `
🍓 *Gudang Buah Kamu* 🍉

💌 *Nama: ${user.registered ? user.name : conn.getName(m.sender)}*
📊 *Level: ${toRupiah(user.level)}*
✨ *Exp: ${toRupiah(user.exp)}*

────────────────────
*${global.rpg.emoticon("pisang")} Pisang: ${toRupiah(user.pisang)}*
*${global.rpg.emoticon("anggur")} Anggur: ${toRupiah(user.anggur)}*
*${global.rpg.emoticon("mangga")} Mangga: ${toRupiah(user.mangga)}*
*${global.rpg.emoticon("jeruk")} Jeruk: ${toRupiah(user.jeruk)}*
*${global.rpg.emoticon("apel")} Apel: ${toRupiah(user.apel)}*

🍱 *Total Buah: ${toRupiah(total)} Buah*
`.trim()
m.reply(text)
}

handler.help = ['buah']
handler.tags = ['rpg']
handler.command = /^((list)?(buah|fruits?))$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

const toRupiah = number => parseInt(number).toLocaleString().replace(/,/g, ",")