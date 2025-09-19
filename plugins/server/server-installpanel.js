import { Client } from 'ssh2'
import crypto from 'crypto'
import { instalPanel } from '../../lib/server.js'

let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("*ipvps|pwvps|panel.com|node.com|ramserver*")
let ssh = args[0].split("|")
if (ssh.length < 5) return m.reply("*ipvps|pwvps|panel.com|node.com|ramserver*")
const ress = new Client()
const settings = {
host: ssh[0],
port: '22',
username: 'root',
password: ssh[1]
}
const passwordPanel = generatePassword(4)
const domainpanel = ssh[2]
const domainnode = ssh[3]
const ramserver = ssh[4]
ress.on('ready', async () => {
await m.reply(`🍓 *Memproses install server panel...*
🏷 *Mohon tunggu 1 - 10 menit hingga selesai~*`)
await instalPanel(ress, { domainpanel, domainnode, ramserver, passwordPanel, conn, m })
}).connect(settings)
}

handler.help = ["installpanel"]
handler.tags = ["server"]
handler.command = /^(installpanel)$/i
handler.mods = true

export default handler

function generatePassword(length = 4) {
const chars = "0123456789"
return Array.from(crypto.randomBytes(length))
.map(byte => chars[byte % chars.length])
.join("")
}