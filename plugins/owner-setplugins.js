
let handler = async (m, { args }) => {
let [command, property, value] = args
if (!command || !property || typeof value === 'undefined')
return m.reply(`👧🏻 *Contoh penggunaan:*\n*.setplugin tiktok premium true/false*`)
let plugin = Object.values(global.plugins).find(p =>
Array.isArray(p.help) && p.help.map(h => h.toLowerCase()).includes(command.toLowerCase())
)
if (!plugin) return m.reply('❌ *Plugin tidak ditemukan!*')
let allowed = ['owner', 'premium', 'limit', 'admin', 'group', 'rpg', 'game', 'nsfw']
if (!allowed.includes(property))
return m.reply(`📝 *Properti tidak dikenali!*\n\n📌 *Bisa diatur:*\n${allowed.map(v => `*• ${v}*`).join('\n')}`)
plugin[property] = value === 'true'
m.reply(`✨ *Berhasil! Properti ${property} untuk plugin ${command} telah diatur ke ${value}*`)
}

handler.help = ['setplugin']
handler.tags = ['owner']
handler.command = /^(setplugin)$/i
handler.mods = true

export default handler