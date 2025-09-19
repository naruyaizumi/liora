import fs from 'fs'
let handler = async (m, { conn }) => {
let sesi = await fs.readFileSync('./database.json')
return await conn.sendMessage(m.chat, { document: sesi, mimetype: 'application/json', fileName: 'database.json' }, { quoted: m })
}

handler.help = ['getdb']
handler.tags = ['owner']
handler.command = /^(getdb)$/i
handler.mods = true

export default handler