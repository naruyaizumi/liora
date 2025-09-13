
let handler  = async (m, { conn, text }) => {

if (!text) return conn.reply(m.chat, '*Teksnya Mana Sayang?*', m)

m.reply(`${text}`, false, {
contextInfo: {
forwardingScore: 1000,
isForwarded: true
}
})
}
handler.help = ['teruskan'].map(v => v + ' <teks>')
handler.tags = ['tools']
handler.command = /^(teruskan)$/i
handler.owner = true
handler.register = true

export default handler 
