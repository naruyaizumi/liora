import yts from "yt-search"

let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`🍬 *Masukkan kata kunci pencarian dulu ya!* \n\n🍭*Contoh: ${usedPrefix + command} Serana*`)
try {
await global.loading(m, conn)
let search = await yts(text)
let results = search.videos
if (!results.length) return m.reply("🍩 *Video tidak ditemukan!*")
let sections = [
{
title: "🍱 Hasil Pencarian YouTube",
rows: results.slice(0, 10).map((v, i) => ({
header: `🍙 ${v.title}`,
title: `${i + 1}. ${v.author.name}`,
description: `🍜 Durasi: ${v.timestamp} | 👀 ${v.views} views`,
id: `.play ${v.title}`
}))
}
]
await conn.sendMessage(m.chat, {
image: { url: results[0].thumbnail },
caption: `🍰 *Ditemukan ${results.length} hasil pencarian YouTube!* 🍡\n🍓 *Silahkan pilih Video/Audio yang kamu mau~*`,
footer: "🍛 YouTube Search",
title: "🍤 Pilih Hasil",
interactiveButtons: [
{
name: "single_select",
buttonParamsJson: JSON.stringify({
title: "🍙 Pilih Hasil",
sections
})
}
]
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["ytsearch"]
handler.tags = ["internet"]
handler.command = /^(yt(s|search)|youtubesearch)$/i

export default handler