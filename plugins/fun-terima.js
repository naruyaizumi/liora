
let handler = async (m, { conn, usedPrefix, command, text }) => {
let user = global.db.data.users
let pacar = user[m.sender].tembak
if (user[m.sender].tembak == "") return m.reply(`😶 *Hah? Siapa yang nembak kamu? Gak ada tuh...*`)
if (user[m.sender].pacar != "") return m.reply(`💍 *Kamu udah punya pacar, gak boleh dobel-dobel dong~*`)
if (user[pacar].ditembak) return m.reply(`⚠️ *Permintaan gak valid yaa, kayaknya ada yang aneh...*`)
user[m.sender].pacar = pacar
user[pacar].pacar = m.sender
user[pacar].ditembak = false
user[m.sender].tembak = ""
user[pacar].tembak = ""
user[m.sender].pacaranTime = new Date() * 1
user[pacar].pacaranTime = new Date() * 1
await m.reply(`💞 *Yeay! Kamu udah resmi jadi pacarnya @${pacar.split("@")[0]}!* \n\n🫶 *Jangan lupa cek status pacaran kamu pakai: ➤ .pacar*`, false, { mentions: [pacar] })
}
handler.help = ["terima"]
handler.tags = ["fun"]
handler.command = /^(terima)$/i
handler.register = true
handler.group = true

export default handler

const delay = time => new Promise(res => setTimeout(res, time))