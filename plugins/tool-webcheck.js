
import { checkWeb } from '../lib/scrape.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`Ex: ${usedPrefix + command} nhentai.net`)
await global.loading(m, conn)
try {
let res = await checkWeb(args)
m.reply(res.map(v => `*• Domain:* ${v.Domain}\n*• Status:* ${v.Status}`).join('\n\n'))
} catch (e) {
m.reply('❌ Gagal memeriksa website.')
console.error(e)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['webcheck']
handler.tags = ['tools']
handler.command = /^web(check|cek)|(check|cek)web$/i
handler.register = true
handler.premium = true

export default handler