
import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
const exec = promisify(_exec).bind(cp)

// Daftar perintah berbahaya yang harus dicegah
const dangerousCommands = [
'rm -rf /', 'rm -rf *', 'rm --no-preserve-root -rf /',
'mkfs.ext4', 'dd if=', 'chmod 777 /', 'chown root:root /', 'mv /', 'cp /', 
'shutdown', 'reboot', 'poweroff', 'halt', 'kill -9 1', '>:(){ :|: & };:', 'wget http://', 'curl http://'
]

const handler = async (m, { conn, isOwner, command, text }) => {
if (global.conn.user.jid !== conn.user.jid) return
if (!isOwner) return
if (!command || !text) return

// Cek apakah perintah masuk dalam daftar berbahaya
if (dangerousCommands.some(cmd => text.trim().startsWith(cmd))) {
return conn.sendMessage(m.chat, { text: `⚠️ *PERINGATAN!*\nPerintah yang kamu coba jalankan sangat berbahaya dan telah diblokir untuk alasan keamanan.` })
}

let output
try {
output = await exec(command.trimStart() + ' ' + text.trimEnd())
} catch (error) {
output = error
} finally {
const { stdout, stderr } = output
if (stdout?.trim()) {
conn.sendMessage(m.chat, { text: `📤 *Output:*\n\`\`\`${stdout.trim()}\`\`\`` })
}
if (stderr?.trim()) {
conn.sendMessage(m.chat, { text: `❗ *Error Output:*\n\`\`\`${stderr.trim()}\`\`\`` })
}
}
}

handler.help = ['$']
handler.tags = ['owner']
handler.customPrefix = /^[$] /
handler.command = new RegExp()
handler.mods = true

export default handler