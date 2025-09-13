
import fs from 'fs/promises'
import path from 'path'

let handler = async (m, { conn, text }) => {
try {
let q = m.quoted ? m.quoted : m
let mime = q.mimetype || ''
if (!text && !/image|video|audio/.test(mime)) 
return m.reply('*Harap masukkan teks atau reply media!*')
let name = global.db.data.users[m.sender]?.name || await conn.getName(m.sender)
let isGroup = m.chat.endsWith('@g.us')
let chatName = isGroup ? await conn.getName(m.chat) : ''
let waktu = new Date().toLocaleTimeString('id-ID', {
hour: '2-digit',
minute: '2-digit',
timeZone: 'Asia/Jakarta'
})
let body = isGroup ? `Group: ${chatName} • ${waktu} WIB` : `Private Chat • ${waktu} WIB`
let pfp = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://i.ibb.co/2WzLyGk/profile.jpg')
let messageOptions = {}
if (/image|video|audio/.test(mime)) {
m.reply('*Sedang memproses, mohon tunggu...*')
let media = await q.download()
let tempDir = path.resolve('./tmp')
await fs.mkdir(tempDir, { recursive: true })
let filePath = path.join(tempDir, `${Date.now()}`)
await fs.writeFile(filePath, media)
if (/image/.test(mime)) messageOptions.image = await fs.readFile(filePath)
else if (/video/.test(mime)) messageOptions.video = await fs.readFile(filePath)
else if (/audio/.test(mime)) {
messageOptions.audio = await fs.readFile(filePath)
messageOptions.ptt = true
messageOptions.mimetype = 'audio/mpeg'
if (text) await conn.sendMessage(await conn.sendMessage('120363417411850319@newsletter', messageOptions), { text })
}
await fs.unlink(filePath)
}
if (text) {
messageOptions.caption = text
if (!/image|video|audio/.test(mime)) {
messageOptions.text = text
messageOptions.contextInfo = {
externalAdReply: {
showAdAttribution: true,
title: `🧸 Pesan dari ${name}`,
body: body,
mediaType: 1,
sourceUrl: "https://instagram.com/naruyaizumi_",
thumbnailUrl: pfp
}
}
}
}
await conn.sendMessage('120363417411850319@newsletter', messageOptions)
m.reply('*Pesan berhasil dikirim ke channel!*')
} catch (e) {
console.error(e)
m.reply('*Terjadi kesalahan saat mengirim pesan!*')
}
}

handler.help = ['upch']
handler.tags = ['owner']
handler.command = /^(ch|upch)$/i
handler.register = true
handler.limit = true

export default handler