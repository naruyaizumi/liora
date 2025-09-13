
const BASE_URL = 'https://the-lazy-media-api.vercel.app'
const LAZY_TALK_ENDPOINT = '/api/games/lazy-talk'

let handler = async (m, { conn, usedPrefix, command, args }) => {
await global.loading(m, conn)

try {
let page = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : 1
let res = await fetch(`${BASE_URL}${LAZY_TALK_ENDPOINT}?page=${page}`, { timeout: 15000 })
if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`)

let apiData = await res.json()
let articles = apiData.data || apiData

if (!articles || (Array.isArray(articles) && articles.length === 0)) throw new Error('Tidak ada artikel Lazy Talk ditemukan')

let articlesList = Array.isArray(articles) ? articles : Object.values(articles)

let formattedArticles = articlesList.slice(0, 5).map((article, index) => {
return `
*🏵️ ${index + 1}. ${article.title || 'Judul tidak tersedia'}*
▸ *Penulis:* ${article.author || 'Unknown'}
▸ *Tanggal:* ${article.time || article.published_at || 'N/A'}
▸ *Kategori:* ${article.category || 'Lazy Talk'}
${article.rating ? `⭐ *Rating:* ${article.rating}` : ''}
*🔗 Baca selengkapnya:* ${article.link || article.url || 'Link tidak tersedia'}
`.trim()
}).join('\n\n━━━━━━━━━━━━━━\n\n')

await conn.reply(m.chat, 
`*🗣 LAZY TALK - HALAMAN ${page}*\n\n${formattedArticles}\n\nGunakan *${usedPrefix}${command} <page>* untuk halaman lainnya`, 
m, {
contextInfo: {
externalAdReply: {
title: `Lazy Talk - Page ${page}`,
body: "Diskusi dan obrolan santai",
thumbnailUrl: articlesList[0]?.thumbnail || "https://i.imgur.com/5XrJYdD.jpg",
sourceUrl: articlesList[0]?.link || articlesList[0]?.url,
mediaType: 1
}
}
})

} catch (error) {
console.error('Error fetching Lazy Talk:', error)

let errorMessage = '⚠ GAGAL MENGAMBIL ARTIKEL\n\n'

if (error.message.includes('404')) {
errorMessage += 'Halaman tidak ditemukan. Coba nomor halaman yang lebih kecil.'
} else if (error.message.includes('429')) {
errorMessage += 'Terlalu banyak permintaan. Tunggu 1 menit lalu coba lagi.'
} else if (error.message.includes('Timeout') || error.message.includes('timed out')) {
errorMessage += 'Timeout: Server tidak merespon. Coba lagi nanti.'
} else if (error.message.includes('slice')) {
errorMessage += 'Format data dari API tidak valid. Silakan coba lagi nanti.'
} else {
errorMessage += error.message
}

await conn.reply(m.chat, errorMessage, m, {
contextInfo: {
externalAdReply: {
title: "Error System",
body: "Lazy Talk tidak tersedia",
thumbnailUrl: "https://i.imgur.com/8Km9tLL.png"
}
}
})
}
}

handler.help = ['lazytalk']
handler.tags = ['info']
handler.command = /^(lazytalk)$/i
handler.register = true
handler.limit = true

export default handler