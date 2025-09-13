
let handler = async (m, { text, usedPrefix, command }) => {
if (!text) return m.reply(`🍬 *Kamu belum menuliskan ulasan!*\n\n📌 *Contoh: ${usedPrefix + command} Bot ini sangat membantu* 💖`)
if (!global.db.data.bots.rating[m.sender]) return m.reply('🍓 *Kamu belum memberi rating!*\n\n*Gunakan .rate <1-5> dulu yaa~*')
if (global.db.data.bots.rating[m.sender].ulasan) return m.reply('🍰 *Kamu sudah menulis ulasan sebelumnya!*')
global.db.data.bots.rating[m.sender].ulasan = text
m.reply('🩷 *Makasih untuk ulasannya yaa~*')
}

handler.help = ['ulasan']
handler.tags = ['main']
handler.command = /^(ulasan)$/i
handler.register = true

export default handler