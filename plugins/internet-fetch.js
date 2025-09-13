
import { writeFileSync, readFileSync } from 'fs'
import { fileTypeFromBuffer } from 'file-type'

let handler = async (m, { text, conn, usedPrefix, command }) => {
try {
if (!/^https?:\/\//.test(text)) return m.reply(`❌ *Awali URL dengan http:// atau https://*\n\n📌 Contoh: ${usedPrefix + command} https://google.com`)
await global.loading(m, conn)
let redirectUrl = text
let redirectCount = 0
while (redirectCount < 10) {
let res = await fetch(redirectUrl, {
redirect: 'manual',
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
}
})
let statusCode = res.status
let statusText = res.statusText || 'Unknown Status'
let contentLength = res.headers.get('content-length') ?? 0
let contentType = res.headers.get('content-type') || 'unknown'
let contentDisposition = res.headers.get('content-disposition') || ''
let filename = contentDisposition?.split('filename=')[1]?.trim()?.replace(/["']/g, '') || new URL(redirectUrl).pathname.split('/').pop() || `download.${Date.now()}`
await conn.sendMessage(m.chat, {
image: { url: 'https://files.catbox.moe/ufc10e.jpg' },
caption: `🌐 *FETCH INFO*
📎 *URL: ${redirectUrl}*
📥 *Redirects: ${redirectCount}*
📡 *Status: ${statusCode} - ${statusText}*
📄 *Content-Type: ${contentType}*
📂 *Filename: ${filename}*`.trim()
}, { quoted: m })
if ([301, 302, 307, 308].includes(statusCode)) {
let location = res.headers.get('location')
if (location) {
redirectUrl = location
redirectCount++
continue
}
}
let buffer = Buffer.from(await res.arrayBuffer())
let fileType = await fileTypeFromBuffer(buffer)
let contentExt = contentType.split('/')[1]?.split(';')[0]?.trim().replace(/\W/g, '')
let ext = fileType?.ext || contentExt || 'bin'
let baseName = filename?.split('.').shift()?.replace(/\W/g, '') || `file_${Date.now()}`
let fileName = baseName + (ext ? `.${ext}` : '')
let mime = fileType?.mime || contentType || 'application/octet-stream'
let filePath = `./tmp/${fileName}`
writeFileSync(filePath, buffer)
if (mime.startsWith('image/')) {
await conn.sendMessage(m.chat, {
image: readFileSync(filePath),
fileName: fileName,
mimetype: mime
}, { quoted: m })
} else if (mime.startsWith('video/')) {
await conn.sendMessage(m.chat, {
video: readFileSync(filePath),
fileName: fileName,
mimetype: mime
}, { quoted: m })
} else if (mime.startsWith('audio/')) {
await conn.sendMessage(m.chat, {
audio: readFileSync(filePath),
fileName: fileName,
mimetype: mime,
ptt: false
}, { quoted: m })
} else {
await conn.sendMessage(m.chat, {
document: readFileSync(filePath),
fileName: fileName,
mimetype: mime
}, { quoted: m })
}
break
}
if (redirectCount >= 10) return m.reply(`❌ *Terlalu banyak pengalihan! Maksimum 10 kali.*`)
} catch (e) {
m.reply(`❌ *Terjadi kesalahan saat fetch!*\n📄 *Error:* \`\`\`${e.message}\`\`\``)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['fetch']
handler.tags = ['internet']
handler.command = /^(fetch|get)$/i
handler.owner = true

export default handler