let tfinventory = {
others: {
money: true
},
tfitems: {
potion: true,
trash: true,
wood: true,
rock: true,
string: true,
emerald: true,
diamond: true,
gold: true,
iron: true
},
tfcrates: {
common: true,
uncommon: true,
mythic: true,
legendary: true
},
tfpets: {
horse: 10,
cat: 10,
fox: 10,
dog: 10
}
}

let rewards = {
common: {
money: 51,
trash: 11,
potion: { chance: 20, amount: 1 },
common: { chance: 10, amount: 1 },
uncommon: { chance: 3, amount: 1 }
},
uncommon: {
money: 101,
trash: 31,
potion: { chance: 20, amount: 1 },
diamond: { chance: 5, amount: 1 },
common: { chance: 10, amount: 1 },
uncommon: { chance: 8, amount: 1 },
mythic: { chance: 3, amount: 1 },
wood: { chance: 15, amount: [1, 2] },
rock: { chance: 15, amount: [1, 2] },
string: { chance: 15, amount: [1, 2] }
},
mythic: {
money: 201,
exp: 50,
trash: 61,
potion: { chance: 25, amount: [1, 2] },
emerald: { chance: 12, amount: 1 },
diamond: { chance: 10, amount: 1 },
gold: { chance: 10, amount: [1, 2] },
iron: { chance: 12, amount: [1, 3] },
common: { chance: 10, amount: 1 },
uncommon: { chance: 8, amount: 1 },
mythic: { chance: 6, amount: 1 },
legendary: { chance: 3, amount: 1 },
pet: { chance: 3, amount: 1 },
wood: { chance: 15, amount: [1, 2] },
rock: { chance: 15, amount: [1, 2] },
string: { chance: 15, amount: [1, 2] }
},
legendary: {
money: 301,
exp: 50,
trash: 101,
potion: { chance: 30, amount: [1, 3] },
emerald: { chance: 15, amount: 1 },
diamond: { chance: 12, amount: 1 },
gold: { chance: 12, amount: [1, 2] },
iron: { chance: 15, amount: [1, 3] },
common: { chance: 10, amount: 1 },
uncommon: { chance: 10, amount: 1 },
mythic: { chance: 7, amount: 1 },
legendary: { chance: 3, amount: 1 },
pet: { chance: 4, amount: 1 },
wood: { chance: 15, amount: [1, 3] },
rock: { chance: 15, amount: [1, 3] },
string: { chance: 15, amount: [1, 3] }
}
}

let handler = async (m, { conn, command, args, usedPrefix }) => {
let user = global.db.data.users[m.sender]
let { stock } = global.db.data.bots
let petiTypes = ['common', 'uncommon', 'mythic', 'legendary']
if (m.quoted?.sender && m.isFromMe === false && m.quoted.sender !== m.sender)
return m.reply('⚠️ *Jangan klik tombol orang lain dong* 😤')
let daftarPeti = petiTypes.map(v => `*• ${global.rpg.emoticon(v)} ${capitalize(v)}: ${toRupiah(user[v] || 0)}*`).join('\n')
if (!args[0]) {
await conn.sendMessage(m.chat, {
image: { url: 'https://cloudkuimages.guru/uploads/images/rcvGnMT4.jpg' },
caption: `🍪 *DAFTAR PETI KAMU:*\n\n${daftarPeti}\n\n🎁 *Pilih jenis peti yang ingin kamu buka semuanya:*`,
footer: 'Tap salah satu pilihan di bawah ini~',
title: '🎉 Gacha Crate System',
interactiveButtons: [
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🎁 Pilih Peti Gacha',
sections: [
{
title: '✨ Peti Gacha Kamu',
rows: [
{
header: `${global.rpg.emoticon('common')} ${toRupiah(user.common || 0)}x`,
title: 'Common Crate',
description: '🎲 Buka semua peti biasa dengan peluang standar!',
id: `.open common`
},
{
header: `${global.rpg.emoticon('uncommon')} ${toRupiah(user.uncommon || 0)}x`,
title: 'Uncommon Crate',
description: '💠 Peti tidak umum, bisa dapet diamond loh~',
id: `.open uncommon`
},
{
header: `${global.rpg.emoticon('mythic')} ${toRupiah(user.mythic || 0)}x`,
title: 'Mythic Crate',
description: '🔥 Peluang besar dapat item langka & pet eksklusif!',
id: `.open mythic`
},
{
header: `${global.rpg.emoticon('legendary')} ${toRupiah(user.legendary || 0)}x`,
title: 'Legendary Crate',
description: '👑 Peti terbaik dengan semua reward OP~',
id: `.open legendary`
},
{
header: '📦 Semua Peti',
title: 'Open All Crates',
description: '🚀 Langsung buka semua jenis peti kamu sekaligus!',
id: `.open all`
}
]
}
]
})
}
],
hasMediaAttachment: false
}, { quoted: m })
return
}
let type = (args[0] || '').toLowerCase()
if (type === 'all') {
let totalLog = []
for (let key of petiTypes) {
let total = user[key] || 0
if (total > 0) {
let hasil = await openCrate(user, key, total)
user[key] -= total
stock[key] += total
if (hasil) totalLog.push(`🍩 *${capitalize(key)} Crate:*\n${hasil}`)
}
}
return m.reply(totalLog.length ? `✨ *Kamu membuka semua peti yang kamu punya!*\n\n${totalLog.join('\n\n')}` : '🧁 *Kamu tidak punya peti untuk dibuka.*')
}
if (!rewards[type]) return m.reply(`📦 *Jenis peti "${type}" tidak dikenal.*`)
let count = user[type] || 0
if (count <= 0) return m.reply(`🧁 *Peti ${capitalize(type)} kamu kosong!*`)
let hasil = await openCrate(user, type, count)
user[type] -= count
stock[type] += count
m.reply(`🍓 *Kamu membuka semua ${toRupiah(count)} ${capitalize(type)} Crate!*\n\n${hasil}`)
}

handler.help = ['open']
handler.tags = ['rpg']
handler.command = /^(open|buka|gacha)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

function isNumber(n) {
let num = parseInt(n)
return typeof num === 'number' && isFinite(num)
}

function capitalize(txt) {
return txt.charAt(0).toUpperCase() + txt.slice(1)
}

function toRupiah(n) {
let num = parseInt(n)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}

Array.prototype.getRandom = function () {
return this[Math.floor(Math.random() * this.length)]
}

async function openCrate(user, type, count) {
let crateReward = {}
for (let i = 0; i < count; i++) {
for (let [reward, value] of Object.entries(rewards[type])) {
if (typeof value === 'number') {
crateReward[reward] = (crateReward[reward] || 0) + value
} else if (typeof value === 'object' && value.chance) {
if (Math.random() * 100 < value.chance) {
let jumlah = Array.isArray(value.amount) ? value.amount.getRandom() : value.amount
crateReward[reward] = (crateReward[reward] || 0) + jumlah
}
}
}
}
for (let [k, v] of Object.entries(crateReward)) {
if (!(k in user)) user[k] = 0
user[k] += v
}
if (!Object.keys(crateReward).length) return '🥺 *Tidak mendapatkan apa pun...*'
return Object.entries(crateReward).map(([k, v]) => `*${global.rpg.emoticon(k)} ${capitalize(k)}: ${toRupiah(v)}*`).join('\n')
}