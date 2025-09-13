let handler = async (m, { conn }) => {
let store = global.db.data.chats[m.chat].store || {}
let sender = m.sender.replace(/[^0-9]/g, '')
let ownItems = Object.entries(store).filter(([_, v]) => v.nomor === sender)
if (ownItems.length === 0) return m.reply(`🍡 *Kamu belum punya item apapun di Store grup ini!*`)
let sections = [{
title: '🍢 Pilih item yang ingin dihapus',
rows: [
...ownItems.map(([id, item]) => ({
title: `🍘 ${item.nama.slice(0, 24)}`,
description: `💰 Rp${Number(item.harga).toLocaleString('id-ID')} • 🧹 Hapus dari Store`,
id: `.output ${id}`
})),
{
title: '🧹 Hapus Semua Item',
description: '🍜 Hapus semua item milikmu dari Store grup ini',
id: `.output all`
}
]
}]
await conn.sendMessage(m.chat, {
image: { url: 'https://cloudkuimages.guru/uploads/images/ZNEf8Qxh.jpg' },
caption: `🍱 *Kamu punya ${ownItems.length} item di Store grup ini!*\nPilih salah satu item yang ingin kamu hapus~`,
footer: 'Gunakan tombol di bawah untuk hapus langsung 🍧',
title: '🧹 Hapus Item Store',
interactiveButtons: [{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🍢 Hapus Item Store',
sections
})
}],
hasMediaAttachment: false
}, { quoted: m })
}

handler.help = ['dellist']
handler.tags = ['store']
handler.command = /^(del(store|list))$/i
handler.group = true
handler.admin = true

export default handler