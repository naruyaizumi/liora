import { xhentai } from '../../lib/scrape.js'

let handler = async (m, { conn }) => {
await global.loading(m, conn)
try {
let cr = await xhentai()
let tan = cr[Math.floor(Math.random() * cr.length)]
let vap = `
🍩 *Judul: ${tan.title}*
🍬 *Kategori: ${tan.category}*
🍫 *Mimetype: ${tan.type}*
🍪 *Dilihat: ${tan.views_count}*
🍯 *Dibagikan: ${tan.share_count}*
`.trim()
await conn.sendFile(m.sender, tan.video_1, 'video.mp4', vap, m)
if (m.isGroup) {
await m.reply("🍙 *Video berhasil dikirim ke private chat kamu!* Cek DM ya~")
}
} catch (e) {
console.error(e)
await m.reply("🍡 *Gagal mengambil data video!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['vidhentai']
handler.command = /^(vidhentai)$/i
handler.tags = ['downloader']
handler.premium = true

export default handler