
let handler = async (m, { conn, text, command }) => {
if (!text) return m.reply(`🔞 *Masukkan kata kunci pencarian!*\n\n*Contoh: .${command} tits*`)
await global.loading(m, conn)
try {
let res = await fetch(`https://api.hiuraa.my.id/search/pornhub?q=${encodeURIComponent(text)}`)
let json = await res.json()
if (!json.status || !json.result || json.result.length === 0) throw '❌ *Tidak ada hasil ditemukan di Pornhub.*'
let list = json.result.map((v, i) => [
`.phdl ${v.link}`,
(i + 1).toString(),
`🎬 ${v.title}`
])
await conn.textList(m.chat, `🔞 *Hasil Pencarian Pornhub: ${text}*`, false, list, m, {
contextInfo: {
externalAdReply: {
title: json.result[0].title,
body: `Durasi: ${json.result[0].duration || 'Tidak tersedia'}`,
thumbnailUrl: json.result[0].imageUrl,
mediaType: 1,
renderLargerThumbnail: true,
sourceUrl: "https://instagram.com/naruyaizumi_",
}
}
})
} catch (e) {
console.error(e)
m.reply('❌ *Terjadi kesalahan saat mengambil data dari Pornhub.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['pornhub']
handler.tags = ['nsfw']
handler.command = /^pornhub$/i
handler.nsfw = true
handler.premium = true
handler.age = 18
handler.register = true

export default handler