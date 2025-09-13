
let handler = async (m, { conn, usedPrefix, command, args }) => {
await global.loading(m, conn)
try {
let page = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : 1
let res = await fetch(`https://the-lazy-media-api.vercel.app/api/tech/cranky-lounge?page=${page}`)
if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`)
let apiData = await res.json()
let articles = apiData.data || apiData
if (!articles || (Array.isArray(articles) && articles.length === 0)) {
throw new Error('*Tidak ada artikel Cranky Lounge ditemukan*')
}
let articlesList = Array.isArray(articles) ? articles : Object.values(articles)
let formattedArticles = articlesList.slice(0, 5).map((article, index) => {
return `🛋️ *${index + 1}. ${article.title || 'Judul tidak tersedia'}*
*▸ Penulis: ${article.author || 'Tidak diketahui'}*
*▸ Tanggal: ${article.time || article.published_at || 'Tidak tersedia'}*
*▸ Kategori: ${article.category || 'Tech Discussion'}*
${article.rating ? `⭐ *Rating: ${article.rating}` : ''}*
🔗 *Link: ${article.link || article.url || 'Tidak tersedia'}*`
}).join('\n\n━━━━━━━━━━━━━━\n\n')
await conn.reply(m.chat,
`💻 *CRANKY LOUNGE — HALAMAN ${page}*\n\n${formattedArticles}\n\n*Gunakan ${usedPrefix + command} <halaman> untuk melihat lainnya.*`,
m)
} catch (error) {
console.error('Cranky Lounge Error:', error)
let errorMessage = '*⚠️ Gagal mengambil artikel Cranky Lounge*\n\n'
if (error.message.includes('404')) {
errorMessage += 'Halaman tidak ditemukan. Coba nomor halaman yang lebih kecil.'
} else if (error.message.includes('429')) {
errorMessage += 'Terlalu banyak permintaan. Tunggu sebentar dan coba lagi.'
} else if (error.message.includes('Timeout') || error.message.includes('timed out')) {
errorMessage += 'Timeout: Server tidak merespon.'
} else if (error.message.includes('slice')) {
errorMessage += 'Format data dari API tidak valid.'
} else {
errorMessage += error.message
}
await conn.reply(m.chat, errorMessage, m)
}
}

handler.help = ['crankylounge']
handler.tags = ['info']
handler.command = /^(crankylounge|lounge)$/i
handler.register = true
handler.limit = true

export default handler