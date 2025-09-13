
let handler = async (m, { conn }) => {
conn.prefix = null
await m.reply('*Prefix berhasil di-reset ke default.*')
}

handler.help = ['resetprefix']
handler.tags = ['owner']
handler.command = /^(resetprefix|resetpr)$/i
handler.mods = true

export default handler