
import { Client } from 'ssh2'

let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("❌ *Format salah!*\n*Contoh: .instaltheme ipvps|pwvps*")
let [ip, pass] = args[0].split("|")
if (!ip || !pass) return m.reply("❌ *Format salah!*\n*Contoh: .instaltheme ipvps|pwvps*")
let ssh = new Client()
ssh.on('ready', () => {
m.reply('🎨 *Menginstall tema NookTheme... mohon tunggu ya sayang~*')
ssh.exec(`
cd /var/www/pterodactyl && 
php artisan down && 
curl -L https://github.com/Nookure/NookTheme/releases/latest/download/panel.tar.gz | tar -xzv && 
chmod -R 755 storage/* bootstrap/cache && 
composer install --no-dev --optimize-autoloader --no-interaction && 
php artisan view:clear && 
php artisan config:clear && 
php artisan migrate --seed --force && 
chown -R www-data:www-data /var/www/pterodactyl/* && 
php artisan queue:restart && 
php artisan up
`, async (err, stream) => {
if (err) throw err
stream.on('close', async () => {
await conn.sendMessage(m.chat, {
text: `🌸 *Tema NookTheme berhasil diinstall!*
🌐 Panel kamu udah makin cantik, coba cek sekarang~`
}, { quoted: m })
ssh.end()
}).stderr.on('data', data => {
console.log('STDERR', data.toString())
})
})
}).on('error', err => {
m.reply(`❌ Gagal terhubung ke VPS:\n${err.message}`)
}).connect({
host: ip,
port: 22,
username: 'root',
password: pass
})
}

handler.help = ['instaltheme']
handler.tags = ['server']
handler.command = /^(instaltheme)$/i
handler.mods = true

export default handler