
let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
if (!args[0] || isNaN(args[0])) return m.reply(`🍩 *Masukkan jumlah hari sewa (angka) terlebih dahulu!*\n\n📌 *Contoh: ${usedPrefix + command} 30*`)
let duration = parseInt(args[0])
let daysMs = duration * 24 * 60 * 60 * 1000
let now = new Date() * 1
let linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i
if (linkRegex.test(args[1])) {
if (!isOwner) return m.reply('🍬 *Hanya owner yang bisa menambahkan sewa melalui link grup.*')
let link = args[1].match(linkRegex)[1]
let groupId = await conn.groupAcceptInvite(link).catch(e => null)
if (!groupId) return m.reply('🍮 *Gagal join ke grup. Link mungkin tidak valid atau sudah kadaluarsa.*')
let metadata = await conn.groupMetadata(groupId)
global.db.data.chats[groupId] = global.db.data.chats[groupId] || {}
global.db.data.chats[groupId].expired = now + daysMs
await conn.reply(groupId, `🍓 *Halo semua! Bot telah bergabung dan masa sewa aktif selama ${duration} hari.*`, null)
await m.reply(`🧁 *Berhasil memasang sewa untuk grup ${metadata.subject} selama ${duration} hari!*`)
} else {
let target = m.chat
global.db.data.chats[target] = global.db.data.chats[target] || {}
let chat = global.db.data.chats[target]
if (chat.expired && chat.expired > now) {
return m.reply('🍩 *Grup ini masih memiliki masa sewa aktif. Gunakan perpanjang jika ingin menambah durasi.*')
}
chat.expired = now + daysMs
m.reply(`🧁 *Masa sewa grup berhasil diaktifkan selama ${duration} hari!*\n\n⏳ *Hitung mundur: ${msToDate(chat.expired - now)}*`)
}
}

handler.help = ['addexpired']
handler.tags = ['owner']
handler.command = /^(set(sewa|expired)|add(sewa|expired))$/i
handler.owner = true

export default handler

function msToDate(ms) {
let days = Math.floor(ms / (24 * 60 * 60 * 1000))
let daysms = ms % (24 * 60 * 60 * 1000)
let hours = Math.floor(daysms / (60 * 60 * 1000))
let hoursms = ms % (60 * 60 * 1000)
let minutes = Math.floor(hoursms / (60 * 1000))
return `${days} hari ${hours} jam ${minutes} menit`
}