
let handler = async (m, { conn, text }) => {
let args = text.split('\n').map(v => v.trim()).filter(v => v)
let name = args[0]
let values = args.slice(1)
if (!name || values.length < 2) return m.reply(`🍬 *Format: .poll pertanyaan*
*pilihan1*
*pilihan2*`)
let poll = {
name,
values,
selectableCount: true
}
await conn.sendMessage(m.chat, { poll })
}

handler.help = ['poll']
handler.tags = ['group']
handler.command = /^(poll|polling)$/i
handler.owner = true

export default handler