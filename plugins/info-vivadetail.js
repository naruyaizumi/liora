const handler = async (m, { conn, text }) => {
  if (!text) return m.reply('*🌸 Contoh penggunaan:*\n*.vivadetail https://vivagoal.com/berita-judul*')
try {
await global.loading(m, conn)
const encodedUrl = encodeURIComponent(text)
const res = await fetch(`https://zenzxz.dpdns.org/berita/vivagoal/detail?url=${encodedUrl}`)
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const { status, creator, result } = await res.json()
if (!status || !result) throw new Error('Berita tidak ditemukan')
const formattedDate = new Date(result.published).toLocaleString('id-ID', {
weekday: 'long',
day: 'numeric',
month: 'long',
year: 'numeric',
hour: '2-digit',
minute: '2-digit'
})

const contentPreview = result.content.length > 300 
? result.content.substring(0, 300) + '...' 
: result.content
const newsDetail = `
*🍬 ${result.title}*

*🍩 Dipublikasikan: ${formattedDate}*

*🍡 Konten Berita:*
${contentPreview}

*🍪 Baca selengkapnya: ${result.url}*
    `.trim()

await conn.sendMessage(m.chat, { 
text: newsDetail,
contextInfo: {
externalAdReply: {
title: '📢 Detail Berita VivaGoal',
body: result.title.substring(0, 50) + (result.title.length > 50 ? '...' : ''),
thumbnailUrl: result.thumbnail || 'https://cloudkuimages.guru/uploads/images/XrBQDj6L.png',
sourceUrl: result.url,
mediaType: 1,
renderLargerThumbnail: true
}
}
})
} catch (error) {
console.error('VivaGoal Detail Error:', error)
await m.reply('*❌ Gagal mengambil detail berita. Pastikan URL valid atau coba lagi nanti*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['vivadetail']
handler.command = /^(vivadetail)$/i
handler.tags = ['info']
handler.limit = true
handler.register = true

export default handler