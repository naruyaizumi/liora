
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
try {
if (!args[0]) return m.reply(`⚠️ *Masukkan teks yang ingin dibuat BratVideo!*\n\n📌 *Contoh: ${usedPrefix + command} Konichiwa*`)
await global.loading(m, conn)
let apiUrl = global.API("btz", "/api/maker/brat-video", { text: args.join(" ") }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan saat memproses teks. Coba lagi nanti!*')
let buffer = await response.arrayBuffer()
buffer = Buffer.from(buffer)
let stickerImage = await sticker(buffer, false, global.config.stickpack, global.config.stickauth)
await conn.sendMessage(m.chat, { sticker: stickerImage }, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['bratvideo']
handler.tags = ['sticker']
handler.command = /^bratvideo$/i
handler.limit = true
handler.register = true

export default handler