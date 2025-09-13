import cp from 'child_process'
import { promisify } from 'util'
let exec = promisify(cp.exec).bind(cp)

let handler = async (m) => {
let o
await global.loading(m, conn)
try {
o = await exec('g++ gcc.cpp -o nench && ./nench')
} catch (e) {
o = e
} finally {
let { stdout, stderr } = o
if (stdout?.trim()) m.reply(`📥 *Output:*\n\`\`\`${stdout.trim()}\`\`\``)
if (stderr?.trim()) m.reply(`❗ *Error Output:*\n\`\`\`${stderr.trim()}\`\`\``)
}
await global.loading(m, conn, true)
}

handler.help = ['benchmark']
handler.tags = ['info']
handler.command = /^(benchmark|bench)$/i
handler.owner = true

export default handler