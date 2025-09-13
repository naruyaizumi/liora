import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime) return m.reply(`⚠️ *Balas atau kirim video dengan caption!*\n\n🍫 *Contoh: ${usedPrefix + command} Tolong analisis video ini!*`)
await global.loading(m, conn)
let media = await q.download()
if (!media) return m.reply('⚠️ *Gagal mengunduh video. Pastikan koneksi stabil ya~*')
let linkUpload = await uploader(media).catch(() => null)
if (!linkUpload) return m.reply('⚠️ *Gagal mengunggah video. Coba beberapa saat lagi ya~*')
if (!text) return m.reply(`⚠️ *Masukkan teks untuk analisis video!*\n\n🍮 *Contoh: ${usedPrefix + command} Tolong analisis video ini!*`)
let apiUrl = global.API("btz", "/api/search/bard-video", { url: linkUpload, text }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan saat menghubungi Bard AI.*')
let json = await response.json()
let resultText = String(json?.result ?? "⚠️ *Hasil tidak ditemukan!*")
await conn.sendMessage(m.chat, {
text: `🎞️ *Bard AI*\n\n🍯 *Prompt: ${text}*\n\n📜 *Hasil:*\n${resultText}`
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n🍬 *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['bardvid']
handler.tags = ['ai']
handler.command = /^(bardvid|bardvideo)$/i
handler.premium = true

export default handler