
let handler = async (m, { conn }) => {
try {
let apiUrl = global.API('btz', '/api/news/tribun', {}, 'apikey')
let response = await fetch(apiUrl)
let json = await response.json()
if (!json?.status || !Array.isArray(json.result))
return m.reply('❌ *Gagal mengambil berita dari Tribun.*')
let data = json.result.slice(0, 10)
let caption = `📰 *Rangkuman Berita Tribun Hari Ini:*\n\n` +
data.map((v, i) => `
*${i + 1}. ${v.berita.trim()}*
📖 *${v.berita_url}*
🗂️ *Jenis: ${v.berita_jenis}*
🕐 *Diunggah: ${v.berita_diupload}`.trim()).join('*\n\n')
await conn.sendMessage(m.chat, {
text: caption,
contextInfo: {
externalAdReply: {
title: data[0].berita.trim(),
body: `${data[0].berita_jenis} • ${data[0].berita_diupload}`,
thumbnailUrl: data[0].berita_thumb,
mediaType: 1,
renderLargerThumbnail: true,
sourceUrl: data[0].berita_url
}
}
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply('❌ *Gagal memuat berita dari Tribun News.*')
}
}

handler.help = ['tribunnews']
handler.tags = ['news']
handler.command = /^(tribunnews)$/i
handler.register = true

export default handler