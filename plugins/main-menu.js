import { join } from 'path'
import { xpRange } from '../lib/levelling.js'
import os from 'os'
import fs from 'fs'

const defaultMenu = {
before: `
${wish()}

🌸 *I N F O   U S E R* 🌸
────────────────────────
🧚‍♀️ *Nama: %name*
🎀 *Status: %status*
🍭 *Limit: %limit*
📈 *Level: %level*
🧸 *Role: %role*
🫧 *EXP: %exp*

🌸 *I N F O  C O M M A N D* 🌸
────────────────────────
*🅟 = Premium*
*🅛 = Limit*
*🅐 = Admin*
*🅓 = Developer*
*🅞 = Owner*
`.trimStart(),
header: `*%category*
────────────────────────`,
body: `*⚘ %cmd* %islimit %isPremium %isAdmin %isMods %isOwner`,
footer: `────────────────────────`,
after: `🍓 *Copyright © Naruya Izumi 2024*`
}
let handler = async (m, { conn, usedPrefix, command, __dirname, isOwner, isMods, isPrems, args }) => {
try {
await global.loading(m, conn)
let tags
let teks = `${args[0]}`.toLowerCase()
let arrayMenu = [
'all',
'ai',
'anime',
'audio',
'database',
'downloader',
'fun',
'game',
'genshin',
'group',
'info',
'internet',
'kerang',
'maker',
'main',
'news',
'nulis',
'nsfw',
'owner',
'primbon',
'quran',
'quotes',
'random',
'rpg',
'search',
'server',
'sound',
'sticker',
'store',
'tools',
'xp'
]
if (!arrayMenu.includes(teks)) teks = '404'
if (teks == 'all') tags = {
'ai': '🧠 AI & Chatbot',
'anime': '🐰 Anime & Manga',
'audio': '🎧 Audio & Musik',
'database': '🧺 Database & Penyimpanan',
'downloader': '🍥 Unduh Media',
'fun': '🍭 Fun & Hiburan',
'game': '🕹️ Game & Hiburan',
'genshin': '🌸 Genshin Impact',
'group': '🧃 Grup & Administrasi',
'info': '📖 Info & Bantuan',
'internet': '💌 Internet & Sosmed',
'kerang': '🧿 Kerang Ajaib',
'main': '🧁 Main Menu',
'maker': '🎀 Kreator & Desain',
'news': '📰 Berita & Informasi',
'nsfw': '🍓 Konten Dewasa',
'nulis': '✏️ Tulisan & Logo',
'owner': '🪄 Admin & Developer',
'primbon': '🔮 Ramalan & Primbon',
'quran': '️🍃 Al-Qur\'an & Islami',
'quotes': '🫧 Kutipan & Motivasi',
'random': '🎲 Acak & Hiburan',
'rpg': '🗡️ RPG & Petualangan',
'search': '🔍 Pencarian & Info',
'server': '🖥️ Server Management',
'sound': '🔊 Sound & Efek',
'sticker': '🌼 Sticker & Kreator',
'tools': '🧸 Alat & Utilitas',
'xp': '🍰 Level & Exp System'
}
if (teks == 'ai') tags = {
'ai': '🧠 AI & Chatbot'
}
if (teks == 'anime') tags = {
'anime': '🐰 Anime & Manga'
}
if (teks == 'audio') tags = {
'audio': '🎧 Audio & Musik'
}
if (teks == 'database') tags = {
'database': '🧺 Database & Penyimpanan'
}
if (teks == 'downloader') tags = {
'downloader': '🍥 Unduh Media'
}
if (teks == 'fun') tags = {
'fun': '🍭 Fun & Hiburan'
}
if (teks == 'game') tags = {
'game': '🍬 Game & Hiburan'
}
if (teks == 'genshin') tags = {
'genshin': '🌸 Genshin Impact'
}
if (teks == 'group') tags = {
'group': '🧃 Grup & Administrasi'
}
if (teks == 'info') tags = {
'info': '📖 Info & Bantuan'
}
if (teks == 'internet') tags = {
'internet': '💌 Internet & Sosmed'
}
if (teks == 'kerang') tags = {
'kerang': '🧿 Kerang Ajaib'
}
if (teks == 'main') tags = {
'main': '🧁 Main Menu'
}
if (teks == 'maker') tags = {
'maker': '🎀 Kreator & Desain'
}
if (teks == 'news') tags = {
'news': '📰 Berita & Informasi'
}
if (teks == 'nulis') tags = {
'nulis': '✏️ Tulisan & Logo'
}
if (teks == 'nsfw') tags = {
'nsfw': '🍓 Konten Dewasa'
}
if (teks == 'owner') tags = {
'owner': '🪄 Admin & Developer'
}
if (teks == 'premium') tags = {
'premium': '💎 Fitur Premium'
}
if (teks == 'primbon') tags = {
'primbon': '🔮 Ramalan & Primbon'
}
if (teks == 'quran') tags = {
'quran': '🍃️ Al-Qur\'an & Islami'
}
if (teks == 'quotes') tags = {
'quotes': '🫧 Kutipan & Motivasi'
}
if (teks == 'random') tags = {
'random': '🎲 Acak & Hiburan'
}
if (teks == 'rpg') tags = {
'rpg': '🗡️ RPG & Petualangan'
}
if (teks == 'search') tags = {
'search': '🔍 Pencarian & Info'
}
if (teks == 'server') tags = {
'server': '🖥️ Server Management'
}
if (teks == 'sound') tags = {
'sound': '🔊 Sound & Efek'
}
if (teks == 'sticker') tags = {
'sticker': '🌼 Sticker & Kreator'
}
if (teks == 'store') tags = {
'store': '🛍️ Toko & Premium'
}
if (teks == 'tools') tags = {
'tools': '🧸 Alat & Utilitas'
}
if (teks == 'xp') tags = {
'xp': '🍰 Level & Exp System'
}
let { exp, level, role } = global.db.data.users[m.sender]
let { min, xp, max } = xpRange(level, global.multiplier)
let user = global.db.data.users[m.sender]
let limit = isPrems ? 'Unlimited' : toRupiah(user.limit)
let name = user.registered ? user.name: conn.getName(m.sender)
let status = isMods ? '🧁 Developer' : isOwner ? '🪄 Owmer' : isPrems ? '💖 Ptemium User' : user.level > 1000 ? '🌟 Elit User' : '🍬 Free User'
if (!global._imageIndex) global._imageIndex = 0
let imageList = [
'https://cloudkuimages.guru/uploads/images/BEtWe2PL.jpg',
'https://cloudkuimages.guru/uploads/images/luUB5CFd.jpg',
'https://cloudkuimages.guru/uploads/images/AJ0vCNdS.jpg',
'https://cloudkuimages.guru/uploads/images/NnXbWf3T.jpg',
'https://cloudkuimages.guru/uploads/images/MJCVh29a.jpg',
'https://cloudkuimages.guru/uploads/images/E7U3vuhc.jpg',
'https://cloudkuimages.guru/uploads/images/G1HOQXsi.jpg',
'https://cloudkuimages.guru/uploads/images/tGMXCRNO.jpg',
'https://cloudkuimages.guru/uploads/images/YrqmiNRZ.jpg',
'https://cloudkuimages.guru/uploads/images/cBjwWlK9.jpg',
'https://cloudkuimages.guru/uploads/images/zUe9nkQD.jpg'
]
let image = imageList[global._imageIndex % imageList.length]
global._imageIndex++
// if (!global._videoIndex) global._videoIndex = 0
// let videoList = [
// 'https://files.cloudkuimages.guru/videos/JuM3cNep.mp4',
// 'https://files.cloudkuimages.guru/videos/l9AroRTU.mp4',
// 'https://files.cloudkuimages.guru/videos/Q3py0wnO.mp4',
// 'https://files.cloudkuimages.guru/videos/DrBynCpK.mp4',
// 'https://files.cloudkuimages.guru/videos/LvgBTeG9.mp4'
// ]
// let video = videoList[global._videoIndex % videoList.length]
// global._videoIndex++
let member = Object.keys(global.db.data.users).filter(v => typeof global.db.data.users[v].commandTotal != 'undefined' && v != conn.user.jid).sort((a, b) => {
const totalA = global.db.data.users[a].command
const totalB = global.db.data.users[b].command
return totalB - totalA
})
let commandToday = 0
for (let number of member) {
commandToday += global.db.data.users[number].command
}
let totalf = Object.values(global.plugins)
.filter(v => Array.isArray(v.help))
.reduce((acc, v) => acc + v.help.length, 0)
let totalreg = Object.keys(global.db.data.users).length
let uptime = formatUptime(process.uptime())
let muptime = formatUptime(os.uptime())
let listRate = Object.values(global.db.data.bots.rating).map(v => v.rate)
let averageRating = listRate.length > 0 ? listRate.reduce((sum, rating) => sum + rating, 0) / listRate.length : 0
let timeID = new Intl.DateTimeFormat('id-ID', {
timeZone: 'Asia/Jakarta',
hour: '2-digit',
minute: '2-digit',
second: '2-digit',
hour12: false
}).format(new Date())
let subtitle = `🕒 ${timeID}`
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const Version = packageJson.version
const mode = global.opts.self ? 'Private' : 'Public'
let listCmd = `
🌸 *I N F O   B O T* 🌸
────────────────────────
🧁 *Name: ${conn.user.name}*
🧸 *Version: ${Version}*
🍰 *Mode Bot: ${mode}*
🗂️ *Database: ${bytesToMB(fs.readFileSync("./database.json").byteLength)} Mb*
⏱️ *Uptime: ${uptime}*
🔋 *Machine Uptime: ${muptime}*
👤 *Total Register: ${totalreg}*
📝 *Command Today: ${commandToday}*
⭐ *Rating: ${averageRating.toFixed(2)}/5.00 (${listRate.length} Users)*
────────────────────────
`.trimStart()
let lists = arrayMenu.map((v, i) => {
return {
title: `📂 Menu ${capitalize(v)}`,
description: `🚀 Untuk Membuka Menu ${v}`,
id: `${usedPrefix + command} ${v}`
}
})
if (teks == '404') {
return await conn.sendMessage(m.chat, {
product: {
productImage: { url: image },
productId: '24529689176623820',
title: wish(),
description: '',
currencyCode: 'UsD',
priceAmount1000: '0',
retailerId: global.config.author,
url: 'https://wa.me/p/24529689176623820/40766498692',
productImageCount: 1
},
businessOwnerJid: '40766498692@s.whatsapp.net',
caption: listCmd,
title: '',
subtitle: subtitle,
footer: global.config.watermark,
interactiveButtons: [
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🍭 𝗣𝗶𝗹𝗶𝗵 𝗱𝗶 𝗦𝗶𝗻𝗶~',
sections: [
{
title: `📑 Fitur Bot Tersedia ${totalf}`,
rows: lists
}
]
})
},
{
name: 'quick_reply',
buttonParamsJson: JSON.stringify({
display_text: '🎐 𝗞𝗼𝗻𝘁𝗮𝗸 𝗢𝘄𝗻𝗲𝗿',
id: '.owner'
})
}
],
hasMediaAttachment: false
})
}
let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
return {
help: Array.isArray(plugin.tags) ? plugin.help: [plugin.help],
tags: Array.isArray(plugin.tags) ? plugin.tags: [plugin.tags],
prefix: 'customPrefix' in plugin,
limit: plugin.limit,
premium: plugin.premium,
mods: plugin.mods,
owner: plugin.owner,
admin: plugin.admin,
enabled: !plugin.disabled,
}
})
let groups = {}
for (let tag in tags) {
groups[tag] = []
for (let plugin of help)
if (plugin.tags && plugin.tags.includes(tag))
if (plugin.help) groups[tag].push(plugin)
}
conn.menu = conn.menu ? conn.menu: {}
let before = conn.menu.before || defaultMenu.before
let header = conn.menu.header || defaultMenu.header
let body = conn.menu.body || defaultMenu.body
let footer = conn.menu.footer || defaultMenu.footer
let after = conn.menu.after || (conn.user.jid == global.conn.user.jid ? '': `*Powered by https://wa.me/${global.conn.user.jid.split`@`[0]}*`) + defaultMenu.after
let _text = [
before,
...Object.keys(tags).map(tag => {
return header.replace(/%category/g, tags[tag]) + '\n' + [
...help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help).map(menu => {
return menu.help.map(help => {
return body.replace(/%cmd/g, menu.prefix ? help: '%p' + help)
.replace(/%islimit/g, menu.limit ? '🅛' : '')
.replace(/%isPremium/g, menu.premium ? '🅟' : '')
.replace(/%isAdmin/g, menu.admin ? '🅐' : '')
.replace(/%isMods/g, menu.mods ? '🅓' : '')
.replace(/%isOwner/g, menu.owner ? '🅞' : '')
.trim()
}).join('\n')
}),
footer
].join('\n')
}),
after
].join('\n')
let text = typeof conn.menu == 'string' ? conn.menu: typeof conn.menu == 'object' ? _text: ''
let replace = {
'%': '%',
p: usedPrefix,
exp: toRupiah(exp - min),
level: toRupiah(level),
limit,
name,
role,
status
}
text = text.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, name) => '' + replace[name])
await conn.sendMessage(m.chat, {
product: {
productImage: { url: image },
productId: '24529689176623820',
title: wish(),
description: '',
currencyCode: 'USD',
priceAmount1000: '0',
retailerId: global.config.author,
url: 'https://wa.me/p/24529689176623820/40766498692',
productImageCount: 1
},
businessOwnerJid: '40766498692@s.whatsapp.net',
caption: text.trim(),
title: '',
subtitle: subtitle,
footer: global.config.watermark,
interactiveButtons: [
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: '🌥️ 𝗠𝗲𝗻𝘂 𝗟𝗮𝗶𝗻𝘆𝗮 ~',
sections: [
{
title: `📑 Fitur Bot Tersedia ${totalf}`,
rows: lists
}
]
})
}
],
hasMediaAttachment: false
})
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(menu|help)$/i
handler.register = true

export default handler

function formatUptime(seconds) {
let minutes = Math.floor(seconds / 60)
let hours = Math.floor(minutes / 60)
let days = Math.floor(hours / 24)
let months = Math.floor(days / 30)
let years = Math.floor(months / 12)
minutes %= 60
hours %= 24
days %= 30
months %= 12
let result = []
if (years) result.push(`${years} tahun`)
if (months) result.push(`${months} bulan`)
if (days) result.push(`${days} hari`)
if (hours) result.push(`${hours} jam`)
if (minutes || result.length === 0) result.push(`${minutes} menit`)
return result.join(' ')
}

function wish() {
let time = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
let hours = time.getHours()
let minutes = time.getMinutes()
let quarter = Math.floor(minutes / 15)
const messages = {
0: [
'🌙 Tengah malam banget, waktunya tidur, ya! Jangan begadang terus~',
'💤 Udah malam banget nih. Masih melek? Coba deh istirahat dulu.',
'🌌 Sunyi banget tengah malam gini, jangan lupa tidur biar segar besok!',
],
1: [
'🛌 Udah jam 1 lebih, ayo tidur yuk. Jangan keseringan begadang~',
'😴 Mata udah berat belum? Tidur yuk, biar badan nggak capek.',
'🌙 Jam segini mending udah di tempat tidur sambil mimpi indah~',
],
2: [
'💤 Masih begadang jam 2? Jangan lupa kesehatan, ya!',
'🌌 Udah dini hari banget nih, coba istirahat biar nggak lelah~',
'🌙 Suasana dingin jam 2, nyaman banget buat tidur, coba deh~',
],
3: [
'🛌 Udah jam 3 dini hari, waktunya tidur, sayang kesehatanmu~',
'💤 Bobo yuk, biar bangun pagi nanti nggak malas~',
'🌌 Jam segini tidur yang nyenyak enak banget, cobain deh!',
],
4: [
'☀️ Pagi buta nih! Udah mulai terang, semangat buat bangun!',
'🍵 Pagi-pagi begini, enaknya ngopi atau minum teh, setuju?',
'🌅 Subuh datang, suasananya adem banget, yuk olahraga ringan!',
],
5: [
'🐓 Ayam berkokok udah kedengeran, waktunya bangun pagi nih!',
'🌞 Matahari mulai muncul, selamat pagi! Jangan malas-malasan~',
'🥪 Udah waktunya sarapan, yuk isi energi buat aktivitas hari ini~',
],
6: [
'🏃‍♂️ Pagi-pagi gini olahraga dulu yuk, biar tubuh lebih sehat~',
'📚 Jangan lupa kerjain tugas atau persiapan kerja ya!',
'☀️ Matahari udah tinggi, semangat ya buat harimu hari ini~',
],
7: [
'💻 Pagi produktif yuk! Fokus ke kerjaan atau tugas dulu~',
'☕ Udah ngopi belum? Kalau belum, waktunya buat ngopi nih!',
'📊 Jangan lupa cek jadwal atau to-do list buat hari ini~',
],
8: [
'🍎 Cemilan pagi penting lho, biar kamu tetap bertenaga!',
'🖥️ Lagi kerja atau belajar? Jangan lupa istirahat mata sebentar~',
'🥗 Udah mulai siang, siap-siap makan siang nanti ya!',
],
9: [
'🌤️ Selamat siang! Yuk makan siang biar energi kamu balik lagi~',
'🍛 Lagi makan siang apa nih? Yang penting sehat dan enak ya~',
'😌 Habis makan siang santai bentar, biar badan lebih rileks~',
],
10: [
'📖 Siang gini enaknya baca buku sambil minum es teh, gimana?',
'☀️ Panasnya mulai terasa nih, jangan lupa banyak minum air ya!',
'🖋️ Masih semangat kan? Yuk, fokus kerja atau belajarnya~',
],
11: [
'🌇 Sore mulai mendekat, jangan lupa selesaikan aktivitasmu~',
'🛋️ Sambil kerja, boleh lho ngemil biar makin produktif~',
'📸 Siang terakhir sebelum sore, coba liat keluar, cakep banget!',
],
12: [
'🌤️ Udah masuk jam 12 nih, siapin makan siang yuk~',
'🍽️ Jangan skip makan siang ya, biar tenaga kamu nggak habis~',
'😌 Habis makan siang jangan lupa istirahat sebentar ya~',
],
13: [
'📖 Abis makan, siang gini cocok buat baca buku santai nih~',
'☀️ Panas banget jam segini, jangan lupa minum biar nggak lemas!',
'☀️ Lagi panas nih, jangan lupa minum air biar nggak dehidrasi~',
],
14: [
'📖 Siang-siang gini, cocok buat baca buku atau dengerin podcast!',
'🥤 Waktunya ngemil atau minum yang seger-seger nih~',
'🖋️ Kerjaan masih belum selesai? Santai, satu-satu aja ya~',
],
15: [
'🌇 Udah sore! Jangan lupa stretching biar badan nggak kaku~',
'🍪 Sore-sore gini ngemil apa nih yang cocok? Cookies enak kali ya~',
'🏞️ Langit sore udah mulai berubah warna, cantik banget deh~',
],
16: [
'📸 Coba deh foto-foto langit sore, pasti aesthetic banget!',
'🛋️ Sore gini cocok buat santai di sofa sambil nonton~',
'🍵 Teh sore emang paling nikmat, apalagi sama camilan~',
],
17: [
'🌅 Menjelang malam nih, suasananya adem banget ya~',
'🕯️ Udah sore, jangan lupa nyiapin makan malam ya!',
'🍽️ Mau makan apa malam ini? Yuk, siap-siap makan bareng~',
],
18: [
'🌙 Malam tiba, waktunya buat tenangin pikiran~',
'🍲 Jangan lupa makan malam biar nggak kelaperan nanti~',
'📺 Waktunya nonton acara favorit atau film seru malam ini~',
],
19: [
'🎮 Lagi main game? Jangan lupa cek waktu, ya!',
'📱 Scroll sosmed sambil denger musik malam juga asik lho~',
'🎶 Musik slow malam ini bikin suasana lebih santai banget~',
],
20: [
'📖 Malam gini cocok banget buat baca novel atau jurnal~',
'✨ Jangan lupa skincare malam biar glowing terus ya~',
'🛌 Udah jam 8 lebih, waktunya relaksasi sebelum tidur~',
],
21: [
'🌌 Udah malam nih, jangan begadang ya, nggak baik buat badan~',
'💤 Siapin diri buat tidur yang nyenyak, biar besok fresh~',
'🌙 Tidur lebih awal itu bagus lho, coba deh biasain~',
],
22: [
'🌌 Udah larut malam nih, jangan lupa matiin lampu sebelum tidur~',
'✨ Mimpi indah ya nanti, semoga besok lebih baik lagi~',
'🛌 Jangan lupa tidur yang cukup, biar badan tetap sehat~',
],
23: [
'💤 Udah tengah malam banget, waktunya tidur nyenyak~',
'🌙 Jangan begadang terus ya, kasihan badan kamu~',
'🕯️ Tidur malam yang nyenyak bikin kamu lebih segar besok!',
'✨ Selamat malam, sampai jumpa besok! Tidur nyenyak ya~'
]
}
let message = messages[hours]?.[quarter] || messages[hours]?.[3] || '✨ Waktu berjalan terus, semangat jalani harimu ya~'
return `*${message}*`
}

function capitalize(word) {
return word.charAt(0).toUpperCase() + word.substr(1)
}

const toRupiah = number => parseInt(number).toLocaleString().replace(/,/g, ".")

function bytesToMB(bytes) {
return (bytes / 1048576).toFixed(2)
}