
const BASE_URL = 'https://the-lazy-media-api.vercel.app'
const TECH_ENDPOINT = '/api/tech'

let handler = async (m, { conn, usedPrefix, command, args }) => {

await global.loading(m, conn)

try {
let page = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : 1
let res = await fetch(`${BASE_URL}${TECH_ENDPOINT}?page=${page}`)

if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`)

let techNews = await res.json()

if (!techNews || techNews.length === 0) {
throw new Error('Tidak ada berita tech ditemukan')
}

let newsList = techNews.slice(0, 5).map((news, index) => {
return `
*📰 ${index + 1}. ${news.title}*
▸ *Sumber:* ${news.author || 'Unknown'}
▸ *Tanggal:* ${news.time || 'N/A'}
▸ *Kategori:* ${news.category || 'Tech'}
🔗 *Baca selengkapnya:* ${news.link}
`.trim()
}).join('\n\n')

await conn.reply(m.chat,
`*🚀 TECH NEWS UPDATE - Halaman ${page}*\n\n${newsList}\n\nGunakan *${usedPrefix}${command} <page>* untuk melihat halaman lainnya`,
m, {
contextInfo: {
externalAdReply: {
title: `Tech News - Page ${page}`,
body: "Update terbaru dunia teknologi",
thumbnailUrl: "https://i.imgur.com/Jqye3Ly.png",
sourceUrl: techNews[0]?.link
}
}
})

} catch (error) {
console.error('Error fetching tech news:', error)

let errorMessage = `*⚠️ GAGAL MENGAMBIL BERITA*\n\n`

if (error.message.includes('404')) {
errorMessage += 'Halaman tidak ditemukan. Coba nomor halaman yang lebih kecil.'
} else if (error.message.includes('429')) {
errorMessage += 'Terlalu banyak permintaan. Silakan coba lagi nanti.'
} else if (error.message.toLowerCase().includes('timeout')) {
errorMessage += 'Timeout: Server tidak merespon. Coba lagi nanti.'
} else {
errorMessage += error.message
}

await conn.reply(m.chat, errorMessage, m)
}
}

handler.help = ['technews <page>']
handler.tags = ['info']
handler.command = /^(technews|beritatech)$/i
handler.register = true
handler.limit = true

export default handler