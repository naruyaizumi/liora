let handler = async (m, { conn }) => {
let store = global.db.data.chats[m.chat].store
let items = Object.values(store).filter(item =>
item.id && item.nama && item.harga && item.nomor && item.deskripsi && item.media
)
if (items.length === 0) return conn.sendMessage(m.chat, {
image: { url: 'https://cloudkuimages.guru/uploads/images/ZNEf8Qxh.jpg' },
caption: `🍔 *Belum ada item Store di grup ini!*`,
footer: 'Gunakan .addlist untuk menambahkan item baru ya~',
title: '🛒 Store Kosong',
interactiveButtons: [],
hasMediaAttachment: false
}, { quoted: m })

let sections = [{
title: '🍱 Store Grup Kamu',
rows: items.map(item => {
return {
header: `🍙 Rp${Number(item.harga).toLocaleString('id-ID')}`,
title: `🍢 ${item.nama.slice(0, 24)}`,
description: '',
id: `.input ${item.id}`
}
})
}]
await conn.sendMessage(m.chat, {
image: { url: 'https://cloudkuimages.guru/uploads/images/ZNEf8Qxh.jpg' },
caption: `🍛 *Terdapat ${items.length} item dalam Store grup ini!*`,
footer: 'Pilih salah satu untuk melihat detailnya~',
title: '📦 Store Interaktif',
interactiveButtons: [
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '📦 Pilih Item Store',
sections
})
}
],
hasMediaAttachment: false
}, { quoted: m })
}

handler.help = ['liststore']
handler.tags = ['store']
handler.command = /^(liststore|list)$/i
handler.group = true
handler.register = true

export default handler