
import { anime } from '../lib/scrape.js'

let handler = async(m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`*Masukan Nama Anime!* \n\n> *Contoh :* \n*${usedPrefix + command} Majo No Tabitabi*`)
await global.loading(m, conn)
let data = await anime(text)
let caption = `
*Title : ${data.title}*

*Synopsis :* ${data.synopsis}

${data.info.map(v => {
return `${v.type} : ${v.result}`.trim()
}).join('\n')}

*Related :*
${data.related.map(v => {
return `• ${v.name} ( ${v.type.replace(':', '')} )`.trim()
}).join('\n')}

*Trailer :*
${data.trailer}
`.trim()
conn.sendFile(m.chat, data.image, false, caption, m)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}
handler.help = ['animeinfo']
handler.tags = ['anime']
handler.command = /^(anime(info)?)$/i
handler.limit = true
handler.register = true
export default handler