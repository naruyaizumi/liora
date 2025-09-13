let handler = async (m, { conn, text }) => {
let cc = text ? m : m.quoted ? await m.getQuotedObj() : m
let teks = text ? text : cc.text
if (!cc) return m.reply('🩷 *Tidak ada pesan yang bisa dikirim sayang~*')
let allGroups = Object.entries(conn.chats).filter(([jid, chat]) => jid.endsWith('@g.us'))
let totalGroups = allGroups.length
let groups = []
let blacklisted = 0
for (let [jid, chat] of allGroups) {
let isBlocked = !chat.isChats || chat.metadata?.read_only || chat.metadata?.announce || global.db.data.chats[jid]?.blpromosi
if (isBlocked) {
blacklisted++
continue
}
groups.push(jid)
}
if (!groups.length) return m.reply('🍱 *Semua grup dalam blacklist atau tidak bisa dikirimi pesan.*')
await m.reply(`🍘 *Total grup terdeteksi: ${totalGroups}*
🥢 *Grup diblacklist: ${blacklisted}*
🍜 *Grup aktif yang akan dikirimi: ${groups.length}*`)
const name = global.config.author
const imageUrl = 'https://files.catbox.moe/l0c3c2.jpg'
const getBufferFromUrl = async (url) => {
let res = await fetch(url)
let arrayBuffer = Buffer.from(await res.arrayBuffer())
return Buffer.from(arrayBuffer)
}
const jpegThumbnail = await getBufferFromUrl(imageUrl)
const qtoko = {
key: {
fromMe: false,
participant: '0@s.whatsapp.net',
remoteJid: 'status@broadcast'
},
message: {
productMessage: {
product: {
productImage: {
mimetype: 'image/jpeg',
jpegThumbnail
},
title: name,
description: null,
currencyCode: 'USD',
priceAmount1000: '1',
retailerId: `© ${name}`,
productImageCount: 1
},
businessOwnerJid: '0@s.whatsapp.net'
}
}
}

let success = 0
let failed = 0
for (let id of groups) {
try {
let type = cc.mtype || ''
let content = cc.msg || {}
let quoted = qtoko
if (type === 'imageMessage') {
await conn.sendMessage(id, {
image: await cc.download(),
caption: teks
}, { quoted })
} else if (type === 'videoMessage') {
await conn.sendMessage(id, {
video: await cc.download(),
caption: teks
}, { quoted })
} else if (type === 'documentMessage') {
await conn.sendMessage(id, {
document: await cc.download(),
fileName: content.fileName || 'document',
mimetype: content.mimetype || 'application/octet-stream',
caption: teks
}, { quoted })
} else if (type === 'audioMessage') {
let audioBuffer = await cc.download()
let isPTT = content.ptt === true
let mime = content.mimetype || (isPTT ? 'audio/ogg; codecs=opus' : 'audio/mpeg')
await conn.sendMessage(id, {
audio: audioBuffer,
mimetype: mime,
ptt: isPTT,
seconds: content.seconds || 60
}, { quoted })
} else if (type === 'stickerMessage') {
await conn.sendMessage(id, {
sticker: await cc.download()
}, { quoted })
} else if (type === 'contactMessage') {
let vcard = content.vcard
let nama = content.displayName || 'Kontak'
let nomor = (vcard.match(/TEL;[^:]*:(\+?\d+)/) || [])[1] || ''
await conn.sendContact(id, [[nomor.replace(/\D/g, ''), nama]], quoted)
} else if (type === 'locationMessage') {
await conn.sendMessage(id, {
location: {
degreesLatitude: content.degreesLatitude,
degreesLongitude: content.degreesLongitude,
name: content.name || '',
address: content.address || '',
jpegThumbnail
}
}, { quoted })
} else if (type === 'liveLocationMessage') {
await conn.sendMessage(id, {
location: {
degreesLatitude: content.degreesLatitude,
degreesLongitude: content.degreesLongitude,
name: content.name || '',
accuracyInMeters: content.accuracyInMeters || 0,
speedInMps: content.speedInMps || 0,
degreesClockwiseFromMagneticNorth: content.degreesClockwiseFromMagneticNorth || 0,
caption: content.caption || teks,
live: true
}
}, { quoted })
} else {
await conn.sendMessage(id, {
text: teks,
mentions: await conn.groupMetadata(id).then(res => res.participants.map(p => p.id))
}, { quoted })
}
success++
await delay()
} catch (err) {
console.error(`[ERROR BCHT ${id}]:`, err)
failed++
}
}
await m.reply(`🍱 *Broadcast HT Selesai!*
🍜 *Berhasil: ${success}*
🍡 *Gagal: ${failed}*
🍘 *Total Grup Aktif: ${groups.length}*`)
}

handler.help = ['bcht']
handler.tags = ['owner']
handler.command = /^(bcht)$/i
handler.owner = true

export default handler

function delay() {
return new Promise(resolve => setTimeout(resolve, 5500))
}