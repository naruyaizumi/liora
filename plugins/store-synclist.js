let handler = async (m, { conn }) => {
let nomor = m.sender.replace(/[^0-9]/g, '')
let allChats = global.db.data.chats || {}
let groupNames = {}
let myItems = []
for (let [jid, chat] of Object.entries(conn.chats)) {
if (jid.endsWith('@g.us')) {
try {
let meta = await conn.groupMetadata(jid)
groupNames[jid] = meta.subject
} catch {}
}
}
for (let jid in allChats) {
let store = allChats[jid].store || {}
for (let id in store) {
let item = store[id]
if (item.nomor === nomor && item.nama && item.harga && item.media) {
item._origin = jid
myItems.push(item)
}
}
}
if (myItems.length === 0) return m.reply('🍡 *Kamu belum punya item di Store manapun!*\n*Gunakan .addlist di grup manapun untuk menyimpan item milikmu ya~*')
let groupStore = global.db.data.chats[m.chat].store || {}
let infoByGroup = {}
let added = 0
myItems.forEach(item => {
if (groupStore[item.id]) return
groupStore[item.id] = item
let origin = item._origin
if (!infoByGroup[origin]) infoByGroup[origin] = []
infoByGroup[origin].push(item)
added++
})
global.db.data.chats[m.chat].store = groupStore
let report = `🍜 *Sinkronisasi Store Berhasil!*\n\n🍱 *Total Item Ditambahkan: ${added}*\n🥢 *Daftar Asal Grup:*`
for (let jid in infoByGroup) {
let items = infoByGroup[jid]
let name = groupNames[jid] || '🍘 Tidak diketahui'
report += `\n\n🍙 *${name}*\n🍡 *ID Grup: ${jid}*\n🍤 *Jumlah Item: ${items.length}*`
}
await conn.sendMessage(m.chat, {
text: report,
contextInfo: {
externalAdReply: {
title: '🍢 Sinkronisasi Store Berhasil!',
body: 'Gunakan .liststore untuk melihat item~',
mediaType: 1,
renderLargerThumbnail: true,
thumbnailUrl: 'https://cloudkuimages.guru/uploads/images/ZNEf8Qxh.jpg'
}
}
}, { quoted: m })
}

handler.help = ['synclist']
handler.tags = ['store']
handler.command = /^(sync(store|list))$/i
handler.group = true
handler.admin = true

export default handler