
import { writeFile } from 'fs/promises'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

let handler = async (m, { conn, text }) => {
try {
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q)?.mimetype || ''
await global.loading(m, conn)
const pdfDoc = await PDFDocument.create()
const filename = `converted_${Date.now()}.pdf`
const filePath = `/tmp/${filename}`
if (/image\/(jpe?g|png)/.test(mime)) {
let buffer = await q.download()
let image = mime.includes('png') ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer)
let page = pdfDoc.addPage([image.width, image.height])
page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
} else {
let isi = text || q.text
if (!isi) return m.reply('📌 *Kirim atau balas gambar atau teks yang ingin diubah ke PDF!*')
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
const fontSize = 12
const lineHeight = 18
const margin = 50
const pageWidth = 595.28
const pageHeight = 841.89
let lines = isi.split('\n')
let page = pdfDoc.addPage([pageWidth, pageHeight])
let y = pageHeight - margin
for (let line of lines) {
if (y < margin + lineHeight) {
page = pdfDoc.addPage([pageWidth, pageHeight])
y = pageHeight - margin
}
let textWidth = font.widthOfTextAtSize(line, fontSize)
let x = (pageWidth - textWidth) / 2
page.drawText(line, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
y -= lineHeight
}
}
let pdfBytes = await pdfDoc.save()
await writeFile(filePath, pdfBytes)
await conn.sendMessage(m.chat, {
document: { url: filePath },
fileName: filename,
mimetype: 'application/pdf'
}, { quoted: m })

} catch (e) {
console.error(e)
m.reply('❌ *Gagal mengonversi ke PDF!*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['topdf']
handler.tags = ['tools']
handler.command = /^topdf$/i
handler.limit = true
handler.register = true

export default handler