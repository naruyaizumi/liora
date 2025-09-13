let handler = async (m, { text, conn, usedPrefix, command }) => {
let id = text.trim()
if (!id) return m.reply(`🍱 *Masukkan ID item atau gunakan:*\n\n📦 *Contoh: ${usedPrefix + command} f8c69cc9a371 atau ${usedPrefix + command} all*`)
let sender = m.sender.replace(/[^0-9]/g, '')
let store = global.db.data.chats[m.chat].store || {}
if (id === 'all') {
let total = 0
for (let key in store) {
if (store[key].nomor === sender) {
delete store[key]
total++
}
}
return m.reply(`🧹 *Semua item kamu berhasil dihapus dari Store grup ini!*\n🍘 *Total yang dihapus:* ${total}`)
}
if (!store[id]) return m.reply(`🍡 *ID '${id}' tidak ditemukan di Store!*`)
if (store[id].nomor !== sender) return m.reply(`🍙 *Kamu tidak punya izin untuk menghapus item ini!*`)
let nama = store[id].nama
delete store[id]
m.reply(`🍢 *Item '${nama}' berhasil dihapus dari Store grup ini!*`)
}

handler.help = ['output']
handler.tags = ['store']
handler.command = /^(output)$/i
handler.group = true
handler.admin = true

export default handler