
import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
try {
if (!args[0]) return m.reply(`🍬 *Masukkan teks untuk dibuat Brat Sticker yaa!*\n\n✨ *Contoh:* ${usedPrefix + command} Konichiwa~`)
await global.loading(m, conn)
let response = await fetch(global.API("btz", "/api/maker/brat", { text: args.join(" ") }, "apikey"))
if (!response.ok) return m.reply('🍡 *Aduh... gagal memproses teks, coba lagi nanti yaa!*')
let buffer = Buffer.from(await response.arrayBuffer())
let stickerImage = await sticker(buffer, false, global.config.stickpack, global.config.stickauth)
await conn.sendFile(m.chat, stickerImage, 'sticker.webp', m)
} catch (e) {
console.error(e)
m.reply(`*Yaaah ada error!* 🍰`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['brat']
handler.tags = ['sticker']
handler.command = /^(brat)$/i
handler.limit = true
handler.register = true

export default handler