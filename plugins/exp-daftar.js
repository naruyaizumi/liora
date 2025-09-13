import { randomInt } from 'crypto'

let Reg = /\|?(.*?)(?:[.|] *?(\d+))?$/i

let handler = async function (m, { conn, text, usedPrefix, command }) {
try {
let pp = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://cloudkuimages.guru/uploads/images/wTGHCxNj.jpg')
let user = global.db.data.users[m.sender]
if (user.registered) return m.reply(`🌸 *Kamu sudah terdaftar, sayang~*\n*Ingin daftar ulang? ketik: ${usedPrefix}unreg <PIN>*`)
let jid = m.sender
let name = text?.trim() || await conn.getName(jid) || ''
let match = name.match(Reg)
name = (match && match[1].trim()) || name
if (/^\+?\d+$/.test(name)) {
name = ''
}
let age = match[2] ? parseInt(match[2]) : null
if (!age) {
let lists = Array.from({ length: 41 }, (_, i) => {
let usia = i + 10
return {
title: `Umur ${usia} Tahun`,
description: `🎂 Klik untuk pilih umur ${usia}`,
id: `${usedPrefix + command} ${name}.${usia}`
}
})
await conn.sendMessage(m.chat, {
image: { url: pp },
caption: '🫧 *Silakan pilih umur kamu di bawah ini yaa~*',
footer: '📌 Pilih umur sesuai usia asli ya, sayang~',
interactiveButtons: [
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🎂 Pilih Umur Kamu',
sections: [
{
title: '📋 Daftar Umur Tersedia',
rows: lists
}
]
})
}
],
hasMediaAttachment: false
}, { quoted: m })
return
}
if (!name) return m.reply('📝 *Nama tidak boleh kosong yaa~ (gunakan huruf)*')
if (!age) return m.reply('🎂 *Umur tidak boleh kosong dong~ (pakai angka ya)*')
if (age > 50) return m.reply('🧓 *Ihhhh Om-om detected! (。-`ω´-)*')
if (age < 10) return m.reply('👶 *Halah bocil, sini masih belum boleh main~*')
if (name.length > 50) return m.reply('📛 *Nama terlalu panjang, max 50 karakter aja ya~*')
await global.loading(m, conn)
user.name = name.trim()
user.age = age
user.regTime = + new Date
user.commandLimit = user.commandLimit === 1000 ? user.commandLimit : 1000
user.registered = true
user.pin = randomInt(100000, 999999)
let capUser = `
🎀 *R E G I S T R A S I   B E R H A S I L* 🎀
────────────────────────
🍓 *Nama: ${user.name}*
🎂 *Umur: ${user.age} tahun*
🔐 *PIN Kamu: ${user.pin}*
────────────────────────
📌 *Simpan baik-baik PIN-mu ya~*
`.trim()
await conn.sendMessage(m.chat, {
image: { url: pp },
caption: capUser,
footer: '📍 Sukses terdaftar, jangan lupa simpan PIN~',
interactiveButtons: [
{
name: 'quick_reply',
buttonParamsJson: JSON.stringify({
display_text: '📖 Menu',
id: '.menu'
})
}
],
hasMediaAttachment: false
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['daftar']
handler.tags = ['xp']
handler.command = /^(daftar|verify|reg(ister)?)$/i

export default handler