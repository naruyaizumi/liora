let handler = async (m, { conn, args, usedPrefix }) => {
let user = global.db.data.users[m.sender]
let chat = conn.casino = conn.casino || {}
if (m.chat in chat) return m.reply('❗ *Masih ada yang main casino di sini. Tunggu dulu ya~*')
chat[m.chat] = true
try {
let bet = /all/i.test(args[0]) ? user.money : parseInt(args[0])
if (!args[0] || isNaN(bet)) return m.reply(`💸 *Gunakan: ${usedPrefix}casino <jumlah> atau ${usedPrefix}casino all*`)
if (bet < 100) return m.reply('💢 *Minimal taruhan Rp100*')
if (user.money < bet) return m.reply('😭 *Uang kamu kurang, kerja dulu gih~*')
user.money -= bet
let emot = ['🎲', '🎰', '🀄', '🃏', '💰']
for (let emoji of emot) {
await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
await delay(300)
}
let chance = Math.random()
let result = ''
let multiplier = 0
if (chance < 0.01) {
result = '🎊 *JACKPOT!*'
multiplier = 5
} else if (chance < 0.5) {
result = '🥳 *MENANG!*'
multiplier = 2
} else {
result = '😵 *KALAH!*'
multiplier = 0
}
let profit = bet * multiplier
user.money += profit
await conn.sendMessage(m.chat, {
text: `🎰 *CASINO ROOM*
${result}

📌 *Taruhan: Rp${toRupiah(bet)}*
📈 *Hasil: Rp${toRupiah(profit)}*
💼 *Saldo Sekarang: Rp${toRupiah(user.money)}*`,
contextInfo: {
externalAdReply: {
title: '🎲 Kasino Liora',
body: 'Taruhan pakai uang virtual dengan sistem adil!',
thumbnailUrl: 'https://files.cloudkuimages.guru/images/V3hrwOxl.jpg',
mediaType: 1,
renderLargerThumbnail: true
}
}
})
} catch (e) {
console.error(e)
m.reply('❗ *Ada error saat bermain casino.*')
} finally {
delete chat[m.chat]
}
}

handler.help = ['casino']
handler.tags = ['rpg']
handler.command = /^(casino)$/i
handler.register = true
handler.rpg = true

export default handler

const delay = ms => new Promise(res => setTimeout(res, ms))

const toRupiah = angka => parseInt(angka).toLocaleString('id-ID').replace(/\./g, ",")