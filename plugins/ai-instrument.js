import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn }) => {
try {
await global.loading(m, conn)
let q = m.quoted ? m.quoted : m
let media = await q.download().catch(() => null)
if (!media) return m.reply('⚠️ *Gagal mengunduh audio!*')
let linkUpload = await uploader(media).catch(() => null)
if (!linkUpload) return m.reply('⚠️ *Gagal mengunggah audio. Coba lagi nanti!*')
await conn.sendMessage(m.chat, {
text: `🎵 *Proses Ekstraksi Audio...* 

⌛ *Mohon tunggu sebentar, sedang memisahkan vokal dan instrumental dari audio yang dikirim.*`
}, { quoted: m })
let apiUrl = global.API("btz", "/api/tools/voiceremover", { url: linkUpload }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan saat memproses audio. Coba lagi nanti!*')
let json = await response.json()
if (json.result?.error) return m.reply('⚠️ *Gagal mengekstrak audio. Coba lagi nanti!*')
let { vocal_path, instrumental_path } = json.result
await conn.sendMessage(m.chat, { 
audio: { url: instrumental_path }, 
mimetype: 'audio/mp4', 
fileName: "instrumental.mp3",
ptt: true
}, { quoted: m })
await conn.sendMessage(m.chat, { 
audio: { url: vocal_path }, 
mimetype: 'audio/mp4', 
fileName: "vocal.mp3",
ptt: true
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['instrument']
handler.tags = ['ai']
handler.command = /^(instrument|voiceremove)$/i
handler.premium = true
handler.register = true

export default handler