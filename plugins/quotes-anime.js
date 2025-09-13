
let handler = async(m, { conn, text }) => {
let res = await (await fetch('https://katanime.vercel.app/api/getrandom?limit=1'))
if (!res.ok) return m.reply(res.text())
let json = await res.json()
let { indo, character, anime } = json.result[0]
conn.reply(m.chat, `${indo}\n\n📮*By:  _${character}_* \n*Anime:*\n${anime}`, m)
}
handler.help = ['quotesanime']
handler.tags = ['quotes']
handler.command = /^(quotesanime)$/i
handler.limit = true
handler.register = true
export default handler