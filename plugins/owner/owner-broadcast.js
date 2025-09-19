import { doBroadcast } from '../../lib/broadcast.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
let cc = m.quoted ? await m.getQuotedObj() : m
let teks = text
? text.replace(new RegExp(`^(${usedPrefix}${command})\\s*`, 'i'), '')
: cc.text || ''
if (!cc) return m.reply('🩷 *Tidak ada pesan yang bisa dikirim sayang~*')
let allGroups = Object.keys(conn.chats).filter(jid => jid.endsWith('@g.us'))
let totalGroups = allGroups.length
let groups = []
let muted = 0
for (let jid of allGroups) {
let chatDb = global.db.data.chats[jid] || {}
if (chatDb.mute) {
muted++
continue
}
groups.push(jid)
}
if (!groups.length) return m.reply('🍱 *Semua grup dalam mute, tidak ada yang bisa dikirimi broadcast.*')
await m.reply(`🍘 *Total grup terdeteksi: ${totalGroups}*
🔇 *Grup di-mute: ${muted}*
🍜 *Grup aktif yang akan dikirimi: ${groups.length}*`)
const name = global.config.author
const imageUrl = 'https://files.catbox.moe/l0c3c2.jpg'
const res = await fetch(imageUrl)
const jpegThumbnail = Buffer.from(await res.arrayBuffer())
const qtoko = {
key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
message: {
productMessage: {
product: {
productImage: { mimetype: 'image/jpeg', jpegThumbnail },
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
let { success, failed } = await doBroadcast(conn, cc, teks, groups, qtoko, jpegThumbnail, { ht: false })
await m.reply(`🍱 *Broadcast Selesai!*
🍜 *Berhasil: ${success}*
🍡 *Gagal: ${failed}*
🍘 *Total Grup Aktif: ${groups.length}*
🔇 *Total Grup di-mute: ${muted}*`)
}

handler.help = ['broadcast']
handler.tags = ['owner']
handler.command = /^(broadcast|bc)$/i
handler.owner = true

export default handler