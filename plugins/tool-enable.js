let handler = async (m, { conn, isOwner, isAdmin, args, usedPrefix, command }) => {
let chat = global.db.data.chats[m.chat]
let bot = global.db.data.settings[conn.user.jid] || {}
let features = [
{ key: 'adminOnly', scope: 'chat', name: 'Admin Only' },
{ key: 'welcome', scope: 'chat', name: 'Welcome' },
{ key: 'detect', scope: 'chat', name: 'Detect' },
{ key: 'otakuNews', scope: 'chat', name: 'Otaku News' },
{ key: 'notifgempa', scope: 'chat', name: 'Notif Gempa' },
{ key: 'antidelete', scope: 'chat', name: 'Anti Delete' },
{ key: 'blpromosi', scope: 'chat', name: 'Blacklist JPM & Broadcast' },
{ key: 'antiLinks', scope: 'chat', name: 'Anti Link' },
{ key: 'antitagsw', scope: 'chat', name: 'Anti Tag SW' },
{ key: 'antipromosi', scope: 'chat', name: 'Anti Promosi' },
{ key: 'antiSticker', scope: 'chat', name: 'Anti Sticker' },
{ key: 'antiAudio', scope: 'chat', name: 'Anti Audio' },
{ key: 'antiFile', scope: 'chat', name: 'Anti File' },
{ key: 'antiFoto', scope: 'chat', name: 'Anti Foto' },
{ key: 'antiVideo', scope: 'chat', name: 'Anti Video' },
{ key: 'antiToxic', scope: 'chat', name: 'Anti Toxic' },
{ key: 'antiBadword', scope: 'chat', name: 'Anti Badword' },
{ key: 'viewonce', scope: 'chat', name: 'Anti ViewOnce' },
{ key: 'pembatasan', scope: 'chat', name: 'Pembatasan' },
{ key: 'game', scope: 'chat', name: 'Game Mode' },
{ key: 'rpg', scope: 'chat', name: 'RPG Mode' },
{ key: 'nsfw', scope: 'chat', name: 'NSFW Mode' },
{ key: 'teks', scope: 'chat', name: 'Respond Text' },
{ key: 'autolevelup', scope: 'chat', name: 'Auto Level Up' },

{ key: 'self', scope: 'bot', name: 'Self Mode' },
{ key: 'gconly', scope: 'bot', name: 'Group Only' },
{ key: 'pconly', scope: 'bot', name: 'Private Only' },
{ key: 'swonly', scope: 'bot', name: 'Status Only' },
{ key: 'queque', scope: 'bot', name: 'Antrian Pesan' },
{ key: 'noprint', scope: 'bot', name: 'No Print' },
{ key: 'autoread', scope: 'bot', name: 'Auto Read' },
{ key: 'composing', scope: 'bot', name: 'Typing' },
{ key: 'restrict', scope: 'bot', name: 'Restrict Mode' },
{ key: 'autorestart', scope: 'bot', name: 'Auto Restart' },
{ key: 'backup', scope: 'bot', name: 'Auto Backup' },
{ key: 'cleartmp', scope: 'bot', name: 'Clear Tmp File' },
{ key: 'anticall', scope: 'bot', name: 'Anti Call' },
{ key: 'adReply', scope: 'bot', name: 'Ad Reply Mode' },
{ key: 'smlcap', scope: 'bot', name: 'SMLCAP' },
{ key: 'noerror', scope: 'bot', name: 'Hide Error Mode' }
]
let raw = m.selectedButtonId || m.text || ''
let [cmd, mode, fiturKey] = raw.trim().split(' ')
if (cmd === '.setting' && fiturKey) {
let fitur = features.find(f => f.key === fiturKey)
if (!fitur) return m.reply('🔥 *Fitur tidak ditemukan.*')
if (!['enable', 'disable'].includes(mode)) return m.reply(`🔥 *Format salah. Gunakan: ${usedPrefix + command } enable|disable [fitur]*`)
let isEnable = mode === 'enable'
if (fitur.scope === 'chat') {
if (!m.isGroup) return global.dfail('group', m, conn)
if (!(isAdmin || isOwner)) return global.dfail('admin', m, conn)
chat[fitur.key] = isEnable
} else if (fitur.scope === 'bot') {
if (!isOwner) return global.dfail('owner', m, conn)
bot[fitur.key] = isEnable
}
return m.reply(`🍡 *Fitur ${fitur.name} sekarang ${isEnable ? 'AKTIF 🍱' : 'NONAKTIF 🍚'}!*`)
}
if (!args[0]) {
return conn.sendMessage(m.chat, {
image: { url: 'https://files.cloudkuimages.guru/images/2z60n7aV.jpg' },
caption: '🍽️ *Silakan pilih fitur yang ingin kamu aktifkan/nonaktifkan:*',
footer: '*Pengaturan Fitur Interaktif* 🍱',
title: '🍱 Menu Setting Bot',
interactiveButtons: [
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🍙 Enable Fitur Chat',
sections: [{
title: '🍜 Semua Fitur Chat',
rows: features.filter(f => f.scope === 'chat').map(f => {
let aktif = chat[f.key]
return {
header: aktif ? '🧊 Sudah Aktif' : '🔥 Nonaktif',
title: `${f.name} 🍘`,
description: aktif ? `🍱 Saat ini Aktif` : `🍚 Saat ini Nonaktif`,
id: `.setting enable ${f.key}`
}
})
}]
})
},
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🍤 Disable Fitur Chat',
sections: [{
title: '🍣 Semua Fitur Chat',
rows: features.filter(f => f.scope === 'chat').map(f => {
let aktif = chat[f.key]
return {
header: aktif ? '🧊 Aktif' : '🔥 Sudah Off',
title: `${f.name} 🍥`,
description: aktif ? `🍛 Nonaktifkan fitur ini` : `🍚 Fitur sudah tidak aktif`,
id: `.setting disable ${f.key}`
}
})
}]
})
},
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🍵 Enable Fitur Owner',
sections: [{
title: '🍰 Semua Fitur Bot (Owner)',
rows: features.filter(f => f.scope === 'bot').map(f => {
let aktif = bot[f.key]
return {
header: aktif ? '🧊 Aktif' : '🔥 Nonaktif',
title: `${f.name} 🍢`,
description: aktif ? `🍧 Sudah aktif` : `🍡 Klik untuk aktifkan`,
id: `.setting enable ${f.key}`
}
})
}]
})
},
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🍛 Disable Fitur Owner',
sections: [{
title: '🍙 Semua Fitur Bot (Owner)',
rows: features.filter(f => f.scope === 'bot').map(f => {
let aktif = bot[f.key]
return {
header: aktif ? '🧊 Aktif' : '🔥 Off',
title: `${f.name} 🍮`,
description: aktif ? `🍘 Klik untuk nonaktifkan` : `🍚 Sudah tidak aktif`,
id: `.setting disable ${f.key}`
}
})
}]
})
}
]
}, { quoted: m })
}
}

handler.help = ['setting']
handler.tags = ['tools']
handler.command = /^(setting)$/i
handler.register = true
handler.admin = true

export default handler