
import yts from 'yt-search'

let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`🍬 *Masukkan kata kunci pencarian dulu ya!* \n\n🍭*Contoh: ${usedPrefix + command} Serana*`)
try {
await global.loading(m, conn)
let search = await yts(text)
let results = search.videos
if (!results.length) return m.reply('*Video tidak ditemukan!*')
let list = results.slice(0, 10).map((v, i) => {
return [`.play ${v.url}`, (i + 1).toString(), `${v.title}\nDurasi: ${v.timestamp}\nChannel: ${v.author.name}`]
})
await conn.textList(m.chat, `🍰 *Ditemukan ${results.length} hasil pencarian YouTube!* 🍩\n🍓 *Silahkan pilih Video/Audio yang kamu cari yaa~*`, false, list, m, {
contextInfo: {
externalAdReply: {
showAdAttribution: false,
mediaType: 1,
title: results[0].title,
body: results[0].author.name,
thumbnail: Buffer.from(await (await fetch(results[0].thumbnail)).arrayBuffer()),
renderLargerThumbnail: true,
mediaUrl: results[0].url,
sourceUrl: "https://instagram.com/naruyaizumi_",
}
}
})
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ytsearch']
handler.tags = ['search']
handler.command = /^(yt(s|search)|youtubesearch)$/i
handler.limit = true

export default handler