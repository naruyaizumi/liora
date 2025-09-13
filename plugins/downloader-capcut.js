
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`✳️ Link CapCut-nya mana sayang?\n\n*Contoh: ${usedPrefix + command} https://www.capcut.com*`)
await global.loading(m, conn)
try {
let res = await fetch(global.API('btz', '/api/download/capcut', { url: text }, 'apikey'))
if (!res.ok) throw 'Gagal menghubungi server.'
let json = await res.json()
if (!json.status) throw '🥀 Gagal mendapatkan data dari CapCut.'
let { title, author, video } = json.result
let caption = `
🎬 *CapCut Downloader*
────────────
📌 *Judul: ${title}*
👤 *Author: ${author.name}*
`.trim()
await conn.sendMessage(m.chat, {
video: { url: video },
caption
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply('🥀 *Gagal memproses video CapCut.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['capcut']
handler.tags = ['downloader']
handler.command = /^(capcut)$/i
handler.register = true
handler.limit = true

export default handler