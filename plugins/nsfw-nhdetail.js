
import { PDFDocument } from 'pdf-lib'

let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text || isNaN(text)) return m.reply(`🍰 *Contoh:* ${usedPrefix + command} 441508`)
await global.loading(m, conn)
try {
let res = await fetch(global.API("btz", "/api/webzone/nhentai-detail", { query: text }, "apikey"))
let json = await res.json()
if (!json.status) throw 'Doujin tidak ditemukan!'
let { title, images } = json.result
let pageUrls = images.pages.map(v => v.t)
let buffers = await Promise.all(
pageUrls.map(async (url) => {
try {
let res = await fetch(url)
let type = res.headers.get('content-type') || ''
let buffer = Buffer.from(await res.arrayBuffer())
if (!type.startsWith('image/') || buffer.length < 1000) throw `Invalid image`
return { buffer, type }
} catch (e) {
console.warn(`[SKIP] ${url}`)
return null
}
})
)
let valid = buffers.filter(v => v)
if (!valid.length) throw 'Semua gambar gagal diproses.'
let pdf = await PDFDocument.create()
for (let img of valid) {
let embed = img.type.includes('png')
? await pdf.embedPng(img.buffer)
: await pdf.embedJpg(img.buffer)
let page = pdf.addPage([embed.width, embed.height])
page.drawImage(embed, {
x: 0,
y: 0,
width: embed.width,
height: embed.height
})
}
let pdfBytes = await pdf.save()
let safeTitle = (title.pretty || title.english).replace(/[^a-z0-9]/gi, "_")
let filename = `${safeTitle}.pdf`
await conn.sendFile(m.chat, Buffer.from(pdfBytes), filename, `📚 *Judul:* ${title.pretty || title.english}`, m)
} catch (e) {
console.error(e)
m.reply(typeof e === 'string' ? e : 'Gagal mengambil detail doujin.')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['nhdetail']
handler.tags = ['nsfw']
handler.command = /^nhdetail$/i
handler.premium = true
handler.register = true
handler.nsfw = true
handler.age = 18

export default handler