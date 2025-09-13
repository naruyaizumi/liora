
import { uploader } from '../lib/uploader.js'

let handler = async (m, { conn }) => {
try {
await global.loading(m, conn)
let q = m.quoted ? m.quoted : m
let media = await q.download().catch(() => null)
if (!media || !(media instanceof Buffer)) {
return m.reply('🍩 *Gagal mengunduh media atau format tidak dikenali.*')
}
let url = await uploader(media).catch(() => null)
if (!url) return m.reply('🍪 *Gagal mengunggah gambar. Coba lagi nanti yaa*')
let api = `https://api.hiuraa.my.id/tools/to-hijab?imageUrl=${url}`
let res = await fetch(api)
if (!res.ok) throw 'Gagal memproses gambar.'
let buff = Buffer.from(await res.arrayBuffer())
await conn.sendMessage(m.chat, {
image: Buffer.from(buff),
caption: '🧕 Berhijab manis seperti mochi lembut'
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`🍰 *Terjadi kesalahan saat memproses gambar*\n📌 *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['tohijab']
handler.tags = ['tools']
handler.command = /^(tohijab|jadihijab)$/i
handler.limit = true
handler.register = true

export default handler