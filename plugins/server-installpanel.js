import { Client } from 'ssh2'
import crypto from 'crypto'

let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("*ipvps|pwvps|panel.com|node.com|ramserver*")
let ssh = args[0].split("|")
if (ssh.length < 5) return m.reply("*ipvps|pwvps|panel.com|node.com|ramserver*")
let sukses = false
const ress = new Client()
const settings = {
host: ssh[0],
port: '22',
username: 'root',
password: ssh[1]
}
const pass = generatePassword(4)
let passwordPanel = pass
const domainpanel = ssh[2]
const domainnode = ssh[3]
const ramserver = ssh[4]
const deletemysql = `\n`
const commandPanel = `bash <(curl -s https://pterodactyl-installer.se)`
async function instalWings() {
ress.exec(commandPanel, (err, stream) => {
if (err) throw err
stream.on('close', async (code, signal) => {
ress.exec('bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/createnode.sh)', async (err, stream) => {
if (err) throw err
stream.on('close', async (code, signal) => {
const caption = `
*Berikut Detail Akun Panel Kamu 📦*
━━━━━━━━━━━━━━━━━━━
👤 *Username : admin*
🔐 *Password : ${passwordPanel}*
🌐 *${domainpanel}*
━━━━━━━━━━━━━━━━━━━
🌍 *Silahkan Buat Allocation & Ambil Token Wings Di Node Yang Sudah Di Buat Oleh Bot Untuk Menjalankan Wings Dengan .startwings*
`
await conn.sendMessage(m.chat, {
text: caption
}, { quoted: m })
}).on('data', async (data) => {
await console.log(data.toString())
if (data.toString().includes("Masukkan nama lokasi: ")) {
stream.write('IZUMI\n')
}
if (data.toString().includes("Masukkan deskripsi lokasi: ")) {
stream.write('Copyright © 2024 Naruya Izumi\n')
}
if (data.toString().includes("Masukkan domain: ")) {
stream.write(`${domainnode}\n`)
}
if (data.toString().includes("Masukkan nama node: ")) {
stream.write('IZUMI\n')
}
if (data.toString().includes("Masukkan RAM (dalam MB): ")) {
stream.write(`${ramserver}\n`)
}
if (data.toString().includes("Masukkan jumlah maksimum disk space (dalam MB): ")) {
stream.write(`${ramserver}\n`)
}
if (data.toString().includes("Masukkan Locid: ")) {
stream.write('1\n')
}
}).stderr.on('data', async (data) => {
console.log('Stderr : ' + data)
})
})
}).on('data', async (data) => {
if (data.toString().includes('Input 0-6')) {
stream.write('1\n');
}
if (data.toString().includes('(y/N)')) {
stream.write('y\n');
}
if (data.toString().includes('Enter the panel address (blank for any address)')) {
stream.write(`${domainpanel}\n`)
}
if (data.toString().includes('Database host username (pterodactyluser)')) {
stream.write('admin\n')
}
if (data.toString().includes('Database host password')) {
stream.write(`admin\n`)
}
if (data.toString().includes('Set the FQDN to use for Let\'s Encrypt (node.example.com)')) {
stream.write(`${domainnode}\n`)
}
if (data.toString().includes('Enter email address for Let\'s Encrypt')) {
stream.write('admin@gmail.com\n')
}
console.log('Logger: ' + data.toString())
}).stderr.on('data', (data) => {
m.reply(`Error Terjadi kesalahan :\n${data}`)
console.log('STDERR: ' + data)
});
})
}

async function instalPanel() {
ress.exec(commandPanel, (err, stream) => {
if (err) throw err
stream.on('close', async (code, signal) => {
await instalWings()
}).on('data', async (data) => {
if (data.toString().includes('Input 0-6')) {
stream.write('0\n')
} 
if (data.toString().includes('(y/N)')) {
stream.write('y\n')
} 
if (data.toString().includes('Database name (panel)')) {
stream.write('\n')
}
if (data.toString().includes('Database username (pterodactyl)')) {
stream.write('admin\n')
}
if (data.toString().includes('Password (press enter to use randomly generated password)')) {
stream.write('admin\n')
} 
if (data.toString().includes('Select timezone [Europe/Stockholm]')) {
stream.write('Asia/Jakarta\n')
} 
if (data.toString().includes('Provide the email address that will be used to configure Let\'s Encrypt and Pterodactyl')) {
stream.write('admin@gmail.com\n')
} 
if (data.toString().includes('Email address for the initial admin account')) {
stream.write('admin@gmail.com\n')
} 
if (data.toString().includes('Username for the initial admin account')) {
stream.write('admin\n')
} 
if (data.toString().includes('First name for the initial admin account')) {
stream.write('admin\n')
} 
if (data.toString().includes('Last name for the initial admin account')) {
stream.write('© Naruya Izumi\n')
} 
if (data.toString().includes('Password for the initial admin account')) {
stream.write(`${passwordPanel}\n`)
} 
if (data.toString().includes('Set the FQDN of this panel (panel.example.com)')) {
stream.write(`${domainpanel}\n`)
} 
if (data.toString().includes('Do you want to automatically configure UFW (firewall)')) {
stream.write('y\n')
} 
if (data.toString().includes('Do you want to automatically configure HTTPS using Let\'s Encrypt? (y/N)')) {
stream.write('y\n')
} 
if (data.toString().includes('Select the appropriate number [1-2] then [enter] (press \'c\' to cancel)')) {
stream.write('1\n')
} 
if (data.toString().includes('I agree that this HTTPS request is performed (y/N)')) {
stream.write('y\n')
}
if (data.toString().includes('Proceed anyways (your install will be broken if you do not know what you are doing)? (y/N)')) {
stream.write('y\n')
} 
if (data.toString().includes('(yes/no)')) {
stream.write('y\n')
} 
if (data.toString().includes('Initial configuration completed. Continue with installation? (y/N)')) {
stream.write('y\n')
} 
if (data.toString().includes('Still assume SSL? (y/N)')) {
stream.write('y\n')
} 
if (data.toString().includes('Please read the Terms of Service')) {
stream.write('y\n')
}
if (data.toString().includes('(A)gree/(C)ancel:')) {
stream.write('A\n')
} 
console.log('Logger: ' + data.toString())
}).stderr.on('data', (data) => {
m.reply(`Error Terjadi kesalahan :\n${data}`)
console.log('STDERR: ' + data)
})
})
}

ress.on('ready', async () => {
await m.reply(`*Memproses install server panel 🚀*
🏷 *Mohon tunggu 1 - 10 menit hingga proses install selsai*`)
ress.exec(deletemysql, async (err, stream) => {
if (err) throw err
stream.on('close', async (code, signal) => {
await instalPanel()
}).on('data', async (data) => {
await stream.write('\t')
await stream.write('\n')
await console.log(data.toString())
}).stderr.on('data', async (data) => {
m.reply(`Error Terjadi kesalahan :\n${data}`)
console.log('Stderr : ' + data)
})
})
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