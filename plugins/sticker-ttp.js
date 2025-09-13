
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
try {
if (!args[0]) return m.reply(`⚠️ *Masukkan teks yang ingin dibuat TTP!*\n\n📌 *Contoh: \n${usedPrefix + command} Konichiwa*`)
await global.loading(m, conn)
let endpoint = `/api/${command}`
let apiUrl = global.API("lol", endpoint, { text: args.join(" ") }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan saat memproses teks. Coba lagi nanti!*')
let buffer = Buffer.from(await response.arrayBuffer())
let stickerImage = await sticker(buffer, false, global.config.stickpack, global.config.stickauth)
await conn.sendMessage(m.chat, { sticker: stickerImage }, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ttp', 'ttp2', 'ttp3', 'ttp4', 'ttp5', 'ttp6']
handler.tags = ['sticker']
handler.command = /^(ttp|ttp2|ttp3|ttp4|ttp5|ttp6)$/i
handler.limit = true
handler.register = true

export default handler