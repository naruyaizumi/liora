
import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn }) => {
try {
await global.loading(m, conn)
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime || !/image\/(jpe?g|png|webp)/.test(mime)) {
return m.reply('⚠️ *Format tidak dikenali. Hanya gambar (jpg/png/webp) yang didukung.*')
}
if (typeof q.download !== 'function') {
return m.reply('⚠️ *Kirim atau reply gambar yang ingin di-upscale dulu!*')
}
let media = await q.download().catch(() => null)
if (!media || !(media instanceof Buffer)) {
return m.reply('⚠️ *Gagal mengunduh media atau format tidak dikenali.*')
}
let url = await uploader(media).catch(() => null)
if (!url) return m.reply('⚠️ *Gagal mengunggah gambar. Coba lagi nanti!*')
let api = `https://api.hiuraa.my.id/tools/unblur-image?imageUrl=${url}&scale=4`
let res = await fetch(api)
if (!res.ok) throw 'Gagal memproses gambar.'
let json = await res.json()
if (!json.status || !json.result) throw 'Gagal mendapatkan hasil dari server.'
await conn.sendMessage(m.chat, {
image: { url: json.result },
caption: '✨ *Gambar berhasil di-upscale HD x4*'
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi kesalahan!* \n📌 *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['upscale2']
handler.tags = ['tools']
handler.command = /^(upscale2)$/i
handler.premium = true
handler.register = true

export default handler