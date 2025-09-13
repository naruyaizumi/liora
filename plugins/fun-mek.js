
let handler = async (m, { conn, command, text }) => {

if (!text) return conn.reply(m.chat, '*Ketik Namanya Tolol!*', m)

conn.reply(m.chat, `
╭━━━━°「 *Memek ${text}* 」°
┃
┊ *• Nama : ${text}*
┃ *• memek : ${pickRandom(['ih item','Belang wkwk','Mulus kak buat owner ku aja','Putih Mulus','Black Doff','Pink wow','Item Glossy'])}*
┊ *• lubang : ${pickRandom(['perawan','ga perawan','udah pernah dimasukin','masih rapet','tembem'])}*
┃ *• jembut : ${pickRandom(['lebat','ada sedikit','gada jembut','tipis','muluss'])}*
╰═┅═━––––––๑
`.trim(), m)
}
handler.help = ['cekmemek']
handler.tags = ['fun']
handler.command = /^cekmemek/i
handler.limit = true
handler.register = true
export default handler 

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}
