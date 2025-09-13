let handler = async (m, { conn, usedPrefix, command, text }) => {
if (!text) return m.reply(
`*╭─❀  Rating Bot Ini  ❀*
*│ Berikan penilaian dari 1 - 5*
*│*
*│ Contoh:*
*│ ${usedPrefix + command} 5*
*│*
*│ Setelah memberi rating,*
*│ kamu bisa menambahkan ulasan:*
*│ ${usedPrefix}ulasan <pendapat kamu>*
*╰───────────────❀*`)
if (!isNumber(text)) return m.reply("*❀ Masukkan hanya angka 1 hingga 5 ya!*")
if (global.db.data.users[m.sender]?.rate) return m.reply("*❀ Kamu sudah memberi rating.\nGunakan *.ulasan* untuk menambahkan pendapat.*")
if (text < 1 || text > 5) return m.reply("*❀ Nilai tidak valid! Harus dari 1 hingga 5.*")
m.reply(`*❀ Terima kasih atas rating ${text}-nya!*\n*Kamu bisa ketik .ulasan <isi> untuk menambahkan pendapat.*`)
global.db.data.bots.rating[m.sender] = {
rate: +text,
ulasan: ""
}
global.db.data.users[m.sender].rate = true
}

handler.help = ['rate']
handler.tags = ['main']
handler.command = /^(rate|rating)$/i
handler.register = true

export default handler

function isNumber(value) {
value = parseInt(value)
return typeof value === 'number' && !isNaN(value)
}