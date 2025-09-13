
let handler = async (m, { conn }) => {
let url = 'https://raw.githubusercontent.com/naruyaizumi/json/main/doaharian.json'
let res = await fetch(url)
if (!res.ok) return m.reply('🍪 *Gagal mengambil data.*')
let src = await res.json()
let caption = src.map((v, i) => {
return `
*${i + 1}. ${v.title}*

*❃ Latin :*
*_${v.latin}_*

*❃ Arabic :*
*${v.arabic}*

*❃ Translate :*
*${v.translation}*
`.trim()
}).join('\n\n')
m.reply(caption)
}

handler.help = ['doaharian']
handler.tags = ['quran']
handler.command = /^(doaharian)$/i
handler.register = true
handler.limit = true

export default handler