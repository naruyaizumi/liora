let handler = async (m, { conn }) => {
let store = global.db.data.chats[m.chat].store || {}
let data = {}
let users = []
for (let [_, item] of Object.entries(store)) {
if (!item.nomor || !item.nama) continue
if (!data[item.nomor]) data[item.nomor] = []
data[item.nomor].push(item.nama)
if (!users.includes(item.nomor)) users.push(item.nomor)
}
if (users.length === 0) return m.reply(`🍱 *Belum ada kontributor yang menambahkan item di Store grup ini!*`)
let teks = `🍽️ *Daftar Kontributor Store Grup Ini:*\n\n`
let mentions = []
for (let nomor of users) {
let tag = `@${nomor}`
let daftar = data[nomor].map((v, i) => ` 🍢 *${i + 1}. ${v}*`).join('\n')
teks += `🍜 ${tag}\n${daftar}\n\n`
mentions.push(nomor + '@s.whatsapp.net')
}
await conn.sendMessage(m.chat, {
text: teks.trim(),
mentions,
contextInfo: {
externalAdReply: {
title: '🍱 Data Kontributor Store',
body: '🍙 Item berdasarkan pembuat di grup ini 🍘',
thumbnailUrl: 'https://cloudkuimages.guru/uploads/images/ZNEf8Qxh.jpg',
mediaType: 1,
renderLargerThumbnail: true
}
}
}, { quoted: m })
}

handler.help = ['admlist']
handler.tags = ['store']
handler.command = /^(adm(store|list))$/i
handler.group = true
handler.admin = true

export default handler