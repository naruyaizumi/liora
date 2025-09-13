const handler = async (m, { conn }) => {
try {
await global.loading(m, conn)
const res = await fetch('https://zenzxz.dpdns.org/berita/berita-bola')
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const { status, creator, count, result } = await res.json()
if (!status || !result) throw new Error('Gagal mengambil berita')
let newsText = `*💮 VIVAGOAL NEWS [${count} BERITA]*\n\n`
result.forEach((item, index) => {
newsText += `*${index + 1}. ${item.title}*\n*🌸 ${item.published}*\n*🍪 ${item.link}*\n\n`
})
await conn.sendMessage(m.chat, { 
text: newsText,
contextInfo: {
externalAdReply: {
title: '⚽ VivaGoal Latest News',
body: `📅 ${new Date().toLocaleDateString()} | ${count} berita`,
thumbnailUrl: 'https://cloudkuimages.guru/uploads/images/XrBQDj6L.png',
sourceUrl: 'https://vivagoal.com',
mediaType: 1
}
}
})
} catch (error) {
console.error('VivaGoal Error:', error)
await m.reply('*❌ Gagal mengambil berita. Coba lagi nanti*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['vivagoal']
handler.command = /^(vivagoal)$/i
handler.tags = ['info']
handler.limit = true
handler.register = true

export default handler