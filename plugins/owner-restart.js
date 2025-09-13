
import { spawn } from 'child_process'
let handler = async (m, { conn, isROwner, text }) => {
if (!process.send) return m.reply('*Dont: node main.js*\n*Do: node index.js*')
if (global.conn.user.jid == conn.user.jid) {
await m.reply('*R E S T A R T . . .*')
process.send('reset')
} else m.reply('*_eeeeeiiittsssss..._*')
}

handler.help = ['restart']
handler.tags = ['owner']
handler.command = /^(res(tart)?)$/i
handler.mods = true
export default handler