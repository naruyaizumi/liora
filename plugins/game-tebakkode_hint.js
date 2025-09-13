
let handler = async (m, { conn }) => {
conn.tebakkode = conn.tebakkode ? conn.tebakkode : {}
let id = m.chat
if (!(id in conn.tebakkode)) return
let json = conn.tebakkode[id][1]
m.reply('Clue : ' + '```' + json.jawaban.replace(/[AIUEOaiueo]/ig, '_') + '```' + '\n\n_*Jangan Balas Chat Ini Tapi Balas Soalnya*_')
}

handler.command = /^hcode$/i
handler.limit = true

export default handler