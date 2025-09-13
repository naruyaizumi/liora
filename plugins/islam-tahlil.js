
let handler = async (m, { conn }) => {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/main/tahlil.json')
let { result } = await res.json()
let caption = result.map((v, i) => {
return `
*${i + 1}. ${v.title}*

*❃ Arabic :*
*${v.arabic}*

*❃ Translate :*
*${v.translation}*
`.trim()
}).join('\n\n')
m.reply(caption)
}

handler.help = ['tahlil']
handler.tags = ['quran']
handler.command = /^(tahlil)$/i
handler.register = true
handler.limit = true

export default handler