
let handler = async (m, { conn, text }) => {
if (!text) return conn.reply(m.chat, '🍓 *Teksnya mana sayang? Aku gak bisa terusin kalau kamu gak bilang apa-apa~*', m)
m.reply(`${text}`, false, {
contextInfo: {
forwardingScore: 1000,
isForwarded: true
}
})
}

handler.help = ['teruskan']
handler.tags = ['tools']
handler.command = /^(teruskan)$/i
handler.register = true

export default handler