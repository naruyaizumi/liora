
let handler = async (m) => {
let user = global.db.data.users[m.sender]
let time = user.lastmulung + 1800000

if (new Date - user.lastmulung < 1800000)
return m.reply(`🍡 *Kamu kelelahan setelah memulung sebelumnya!*\n⏳ *Tunggu ${msToTime(time - new Date())} lagi untuk bisa mulung lagi yaa~*`)
let botol = Math.floor(Math.random() * 4) + 2
let kaleng = Math.floor(Math.random() * 3) + 1
let kardus = Math.floor(Math.random() * 3) + 1
let gelas = Math.floor(Math.random() * 4) + 2
let plastik = Math.floor(Math.random() * 6) + 3
user.botol += botol
user.kaleng += kaleng
user.kardus += kardus
user.gelas += gelas
user.plastik += plastik
user.lastmulung = new Date * 1
m.reply(`
*🎒 Hasil Mulung Hari Ini!*
🍶 *+${toRupiah(botol)} Botol*
🥫 *+${toRupiah(kaleng)} Kaleng*
📦 *+${toRupiah(kardus)} Kardus*
🥛 *+${toRupiah(gelas)} Gelas*
🛍️ *+${toRupiah(plastik)} Plastik*

🌸 *Terima kasih sudah menjaga lingkungan!*`.trim())
}

handler.help = ['mulung']
handler.tags = ['rpg']
handler.command = /^(mulung)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.energy = 10

export default handler

function msToTime(duration) {
let seconds = Math.floor((duration / 1000) % 60)
let minutes = Math.floor((duration / (1000 * 60)) % 60)
let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
return `${hours} jam ${minutes} menit ${seconds} detik`
}

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}