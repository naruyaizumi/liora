import crypto from 'crypto'
import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, text, command, usedPrefix }) => {
let store = global.db.data.chats[m.chat].store
if (!text || !text.includes('|')) return m.reply(`🍱 *Format salah!*\n*Contoh: ${usedPrefix + command} VPS 8Gb|300000|Deskripsi singkat item*`)
let [nama, harga, ...descArr] = text.split('|').map(v => v.trim())
let deskripsi = descArr.join('|')
let nomor = m.sender.replace(/[^0-9]/g, '')
if (!nama || !harga || !deskripsi) return m.reply(`🍜 *Semua bagian wajib diisi!*`)
if (deskripsi.length > 300) return m.reply(`🍛 *Deskripsi terlalu panjang! Maks. 300 karakter yaa~*`)
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime.startsWith('image/')) return m.reply(`🍣 *Wajib reply gambar produk! Tanpa media, gak bisa disimpan ya sayang~*`)
let media
try {
media = await q.download()
} catch {
return m.reply(`🥟 *Gagal download media! Coba lagi~*`)
}
let mediaUrl = await uploader(media).catch(_ => null)
if (!mediaUrl) return m.reply(`🍡 *Upload gagal! Coba ulangi upload media-nya yaa~*`)
let id = crypto.createHash('md5').update(`${nomor}|${nama}|${harga}`).digest('hex').slice(0, 12)
store[id] = {
id,
nama,
harga,
nomor,
deskripsi,
media: mediaUrl
}
await conn.sendMessage(m.chat, {
image: media,
caption: `🍔 *Item berhasil ditambahkan ke Store!*

🍛 *Nama: ${nama}*
🍢 *Harga: Rp${Number(harga).toLocaleString('id-ID')}*
📞 *Nomor: ${nomor}*
🍮 *Deskripsi:* ${deskripsi}`
}, { quoted: m })
}

handler.help = ['addlist']
handler.tags = ['store']
handler.command = /^(add(store|list))$/i
handler.group = true
handler.admin = true

export default handler