
import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, usedPrefix, command }) => {
try {
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime) return m.reply(`🍡 *Ayo balas gambar dulu, sayangku!*\n\n🍰 *Contoh: ${usedPrefix + command} gambar*`)
if (!/image\/(jpe?g|png)/.test(mime)) return m.reply(`🍬 *Hmm, format file salah~*\n\n🧁 *Gunakan gambar JPG atau PNG yaa~*`)
await global.loading(m, conn)
let img = await q.download()
if (!img) return m.reply('🍫 *Gagal mengunduh gambar*\n\n🍰 *Coba cek koneksi kamu yaa~*')
let url = await uploader(img).catch(() => null)
if (!url) return m.reply('🍫 *Gagal mengunggah gambar ke server!*')
let api = global.API('btz', '/api/tools/removebg', { url }, 'apikey')
let res = await fetch(api)
let json = await res.json()
if (!json.status || !json.url) throw '🍩 *Gagal menghapus background!*'
let buffer = await (await fetch(json.url)).arrayBuffer()
let size = Buffer.byteLength(buffer)
let filename = 'removebg_result.png'
await conn.sendMessage(m.chat, {
image: Buffer.from(buffer),
fileName: filename,
mimetype: 'image/png',
caption: `
🍓 *Gambar selesai diproses!* 🧁
━━━━━━━━━━━━━━━━━━━━
📂 *Nama File: ${filename}*
📏 *Ukuran File: ${(size / 1024).toFixed(2)} KB*
🍰 *Status: Background berhasil dihapus!*
━━━━━━━━━━━━━━━━━━━━
`.trim()
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`🍩 *Ehh, ada kesalahan teknis~* 🍬`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['removebg']
handler.tags = ['tools']
handler.command = /^(removebg)$/i
handler.premium = true
handler.register = true

export default handler