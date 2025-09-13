
let handler = async (m, { conn, command, text }) => {
const caption = `
*Pertanyaan: ${command} ${text}*
*Jawaban: ${pickRandom(['di neraka', 'di rumah owner', 'di mars', 'di tengah laut', 'di belahan dada :v', 'di hatimu >///<'])}*
`.trim()
conn.reply(m.chat, caption, m, { mentions: await conn.parseMention(caption) })
}
handler.help = ['dimanakah']
handler.tags = ['kerang']
handler.command = /^dimanakah$/i
handler.register = true

export default handler

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}