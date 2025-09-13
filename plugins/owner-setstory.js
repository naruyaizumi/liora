
import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, args, text }) => {
let quoted = m.quoted || m
let mime = quoted.mimetype || ''
let mediaType = mime.split('/')[0]
let fileExt = mime.split('/')[1] || 'bin'
let caption = text || quoted.text || ''
if (!quoted.mimetype && !m.hasMedia) {
await conn.sendMessage('status@broadcast', { text: caption })
return m.reply('*Teks berhasil dikirim ke status WhatsApp!*')
}
let media = await quoted.download()
let filePath = path.join('./tmp', `status_${Date.now()}.${fileExt}`)
await fs.promises.writeFile(filePath, media)
if (/image/.test(mime)) {
await conn.sendMessage('status@broadcast', { image: fs.readFileSync(filePath), caption })
} else if (/video/.test(mime)) {
await conn.sendMessage('status@broadcast', { video: fs.readFileSync(filePath), caption })
} else if (/audio/.test(mime)) {
await conn.sendMessage('status@broadcast', { audio: fs.readFileSync(filePath), mimetype: 'audio/mpeg' })
} else if (/document/.test(mime)) {
await conn.sendMessage('status@broadcast', { document: fs.readFileSync(filePath), fileName: path.basename(filePath) })
} else {
await conn.sendMessage('status@broadcast', { document: fs.readFileSync(filePath), fileName: path.basename(filePath) })
}
m.reply('*Berhasil mengirim status ke WhatsApp!*')
}

handler.help = ['setstory']
handler.tags = ['owner']
handler.command = /^(setstory|setsw)$/i
handler.mods = true

export default handler