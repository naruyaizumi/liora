
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

let handler = async (m, { conn, args, usedPrefix, command, __dirname }) => {
if (!args[0]) return m.reply(`🍓 *Masukkan nama file plugin yang ingin diambil~*\n\n*Contoh: ${usedPrefix + command} main-menu*`)
let filename = args[0].trim() + '.js'
let filepath = join(__dirname, '../plugins', filename)
if (!existsSync(filepath)) return m.reply(`🍎 *File "plugins/${filename}" tidak ditemukan!*`)
await conn.sendMessage(m.chat, {
document: readFileSync(filepath),
fileName: filename,
mimetype: 'text/javascript',
caption: `📂 *Berikut file: plugins/${filename}*\n🍡 *Semoga bermanfaat yaa~*`
}, { quoted: m })
}

handler.help = ['getfile']
handler.tags = ['owner']
handler.command = /^(getfile|getplugin|gf)$/i
handler.mods = true

export default handler