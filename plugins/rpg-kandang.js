
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let total = user.banteng + user.harimau + user.gajah + user.kambing + user.panda + user.buaya + user.kerbau + user.sapi + user.monyet + user.ayam + user.babi + user.babihutan
let caption = `
🍰 *Kandang Hewan* 🐾

💌 *Nama: ${user.registered ? user.name : conn.getName(m.sender)}*
📊 *Level: ${toRupiah(user.level)}*
✨ *Exp: ${toRupiah(user.exp)}*

────────────────────
🐂 *Banteng: ${toRupiah(user.banteng)}*
🐅 *Harimau: ${toRupiah(user.harimau)}*
🐘 *Gajah: ${toRupiah(user.gajah)}*
🐐 *Kambing: ${toRupiah(user.kambing)}*
🐼 *Panda: ${toRupiah(user.panda)}*
🐊 *Buaya: ${toRupiah(user.buaya)}*
🐃 *Kerbau: ${toRupiah(user.kerbau)}*
🐮 *Sapi: ${toRupiah(user.sapi)}*
🐒 *Monyet: ${toRupiah(user.monyet)}*
🐓 *Ayam: ${toRupiah(user.ayam)}*
🐖 *Babi: ${toRupiah(user.babi)}*
🐗 *Babi Hutan: ${toRupiah(user.babihutan)}*

🐾 *Total Hewan: ${toRupiah(total)} Ekor*
`.trim()

m.reply(caption)
}

handler.help = ['kandang']
handler.tags = ['rpg']
handler.command = /^(kandang)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}