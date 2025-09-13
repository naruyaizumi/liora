
let handler = async (m, { conn }) => {
await m.reply(global.wait)
conn.sendFile(m.chat, 'https://api.lolhuman.xyz/api/random/kanna?apikey=ed78c137a46873c5b8e5fe3b', '*Bentar Sayang*', '*_Nih kak_*', m)
}
handler.help = ['kannaa']
handler.tags = ['anime']
handler.command = /^(kannaa)$/i
handler.register = true
handler.limit = true
export default handler 