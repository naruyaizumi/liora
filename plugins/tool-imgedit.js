import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
try {
await global.loading(m, conn)
const btz = global.config.APIs.btz
const apikey = global.config.APIKeys[btz]
let text = args[0]
if (!text) return m.reply(`🍙 *Teks tidak boleh kosong!*\n\n🍛 *Contoh: ${usedPrefix + command} halo*`)
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime) return m.reply(`🍢 *Balas atau kirim gambar dengan caption!*\n\n🍤 *Contoh: ${usedPrefix + command} halo*`)
if (!/image\/(jpeg|png|jpg)/.test(mime)) return m.reply('🍡 *Format gambar tidak didukung! Gunakan JPG atau PNG.*')
let media = await q.download().catch(() => null)
if (!media) return m.reply('🍧 *Gagal mengunduh gambar! Pastikan file tidak rusak.*')
let uploaded = await uploader(media).catch(() => null)
if (!uploaded) return m.reply('🍩 *Gagal mengunggah gambar ke Cloud. Coba lagi nanti!*')
let response = await fetch(`${btz}/api/maker/imgedit`, {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({
text,
url: uploaded,
apikey
})
})
if (!response.ok) return m.reply('🍙 *Gagal menghubungi API. Coba lagi nanti!*')
let json = await response.json()
if (!json.result) return m.reply('🍤 *Gagal mendapatkan hasil dari API.*')
await conn.sendMessage(m.chat, {
image: { url: json.result },
caption: `🍱 *Gambar berhasil diedit dengan teks:* ${text}`
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`🍜 *Terjadi Kesalahan!*\n🍘 *Detail:* ${e.message || e}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['imgedit']
handler.tags = ['tools']
handler.command = /^(imgedit)$/i
handler.premium = true
handler.register = true

export default handler