
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let total = user.botol + user.kardus + user.kaleng + user.gelas + user.plastik
let caption = `
🍡 *Karung Barang Bekas* ♻️

💌 *Nama: ${user.registered ? user.name : conn.getName(m.sender)}*
📊 *Level: ${toRupiah(user.level)}*
✨ *Exp: ${toRupiah(user.exp)}*

────────────────────
🍾 *Botol: ${toRupiah(user.botol)}*
📦 *Kardus: ${toRupiah(user.kardus)}*
🥫 *Kaleng: ${toRupiah(user.kaleng)}*
🥤 *Gelas: ${toRupiah(user.gelas)}*
🛍️ *Plastik: ${toRupiah(user.plastik)}*

🎁 *Total Isi: ${toRupiah(total)} Barang*
`.trim()
m.reply(caption)
}

handler.help = ['karung']
handler.tags = ['rpg']
handler.command = /^(karung)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}