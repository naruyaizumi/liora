import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
let q = m.quoted ? m.quoted : null
if (!q) return m.reply(`⚠️ *Balas pesan yang berisi audio!*\n\n🍬 *Contoh: ${usedPrefix + command} Transkrip audio ini*`)
await global.loading(m, conn)
let media = await q.download().catch(() => null)
if (!media) return m.reply('⚠️ *Gagal mengunduh audio. Pastikan koneksi stabil ya~*')
let linkUpload = await uploader(media).catch(() => null)
if (!linkUpload) return m.reply('⚠️ *Gagal mengunggah audio. Coba beberapa saat lagi ya~*')
let inputText = text ? text : "Tolong transkrip audio ini."
let apiUrl = global.API("btz", "/api/search/bard-audio", { url: linkUpload, text: inputText }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Gagal memproses audio ke Bard AI. Ulangi beberapa saat lagi!*')
let json = await response.json()
let resultText = json?.result || "⚠️ *Bard tidak bisa mengenali isi audio ini!*"
await conn.sendMessage(m.chat, {
text: `🎧 *Bard AI*\n\n🍯 *Prompt: ${inputText}*\n\n📜 *Hasil:*\n${resultText}`
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n🍩 *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['bardaud']
handler.tags = ['ai']
handler.command = /^(bardaudio|bardaud)$/i
handler.premium = true
handler.register = true

export default handler