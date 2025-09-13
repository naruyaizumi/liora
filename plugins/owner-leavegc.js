
let handler = async (m, { conn, args, command, text }) => {
let group = text ? text : m.chat
await conn.reply(group, '🍡 *Byee~ Aku pamit dulu ya semua! (≧ω≦)ゞ*\n*Semoga harimu manis seperti Izumi~*', null)
await conn.groupLeave(group)
}

handler.help = ['leavegc']
handler.tags = ['owner']
handler.command = /^(out|leavegc)$/i
handler.owner = true

export default handler