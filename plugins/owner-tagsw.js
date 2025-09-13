import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, args, text }) => {
try {
let jids = global.config.jids || []
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
let content = {}
if (mime) {
let media = await q.download()
if (!media) return m.reply('🥐 *Gagal unduh media!*')
let url = await uploader(media).catch(() => null)
if (!url) return m.reply('🍰 *Upload gagal, coba lagi ya~*')
if (/image/.test(mime)) {
content.image = { url }
if (text) content.caption = text
} else if (/video/.test(mime)) {
content.video = { url }
if (text) content.caption = text
} else if (/audio/.test(mime)) {
content.audio = { url }
content.mimetype = mime
content.backgroundColor = '#000000'
content.ptt = true
} else return m.reply('🍜 *Jenis file belum didukung~*')
} else {
if (!text) return m.reply('🍩 *Kirim teks dong sayang~*')
content.text = text
content.font = 2
content.textColor = '#FF6600'
content.backgroundColor = '#000000'
}
await conn.sendStatusMentions(content, jids.slice(0, 5))
m.reply(`🍕 *Status mention berhasil dikirim ke ${jids.length} target* 🧃`)
} catch (e) {
console.error(e)
m.reply('🍔 *Gagal mengirim status mentions!*\n' + e.message)
}
}

handler.help = ['tagsw']
handler.tags = ['owner']
handler.command = /^(tagsw)$/i
handler.owner = true

export default handler