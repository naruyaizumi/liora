
let handler = async (m, { conn, command, text }) => {

if (!text) return conn.reply(m.chat, '*Ketik Namanya Tolol!*', m)

conn.reply(m.chat, `
╭━━━━°「 *Kontol ${text}* 」°
┃
┊ *• Nama : ${text}*
┃ *• Kontol : ${pickRandom(['ih item','Belang wkwk','Muluss','Putih Mulus','Black Doff','Pink wow','Item Glossy'])}*
┊ *• Status : ${pickRandom(['perjaka','ga perjaka','udah pernah dimasukin','masih ori','jumbo'])}*
┃ *• jembut : ${pickRandom(['lebat','ada sedikit','gada jembut','tipis','muluss'])}*
╰═┅═━––––––๑
`.trim(), m)
}
handler.help = ['cekkontol']
handler.tags = ['fun']
handler.command = /^cekkontol/i
handler.limit = true
handler.register = true
export default handler 

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}
