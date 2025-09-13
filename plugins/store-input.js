let handler = async (m, { conn, args, usedPrefix, command }) => {
let id = args[0]
if (!id) return m.reply(`🍜 *Masukkan ID item store!*\n*Contoh: ${usedPrefix + command} f8c69cc9a371*`)
let store = global.db.data.chats[m.chat]?.store || {}
let item = Object.values(store).find(v => v.id === id)
if (!item) return m.reply(`🍱 *Item dengan ID '${id}' tidak ditemukan!*`)
await conn.sendFile(m.chat, item.media, 'item.jpg', [
`🍔 *Detail Item Store:*`,
`🍛 *Nama: ${item.nama}*`,
`🍢 *Harga: Rp${Number(item.harga).toLocaleString('id-ID')}*`,
`📞 *Chat: wa.me/${item.nomor}*`,
`🍮 *Deskripsi:* ${item.deskripsi}`
].join('\n'), m)
}

handler.help = ['input']
handler.tags = ['store']
handler.command = /^(input)$/i
handler.group = true

export default handler