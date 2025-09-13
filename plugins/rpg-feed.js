
let petTypes = ['cat', 'dog', 'horse', 'fox', 'dragon', 'lion', 'rhinoceros', 'centaur', 'scorpion', 'griffin', 'phoenix', 'wolf']

let handler = async (m, { conn, args, usedPrefix }) => {
let info = `
— 🍰 *P E T  F E E D I N G* 🍰 —

📦 *Pet List:*
${petTypes.map(p => `*• ${global.rpg.emoticon(p)} ${capitalize(p)}*`).join('\n')}

📌 *Contoh: ${usedPrefix}feed cat*
`.trim()
let pesan = pickRandom([
'nyam nyam~',
'makasih yaa~',
'hmm lezat~',
'makanannya enak banget~',
'sipp makasih~',
'arigatou~',
'aku kenyang deh~',
'slurrpp~',
'horeee dapet makanan~',
'makan dulu ah~',
'aku suka ini~',
'uwuuu~ makasii',
'cuuup makasihhh~',
'nani?! makanan?! hihi~',
'itu lagi dong~',
'hontou ni arigatou~',
'aku jadi semangat lagii~',
'moarrr~ hehe',
'aku sayang kamu~',
'chuuu~ lezat bgt~'
])
let type = (args[0] || '').toLowerCase()
let user = global.db.data.users[m.sender]
if (!petTypes.includes(type)) return m.reply(info)
let pet = type
let petName = capitalize(pet)
let petEmoji = global.rpg.emoticon(pet)
if (user[pet] === 0) return m.reply(`😿 *Kamu belum memiliki ${petName}*`)
if (user[pet] >= 10) return m.reply(`🍬 *${petName} kamu sudah mencapai level maksimal!*`)
let timeSinceLastFeed = new Date() - (user[`${pet}lastfeed`] || 0)
let timeRemaining = 60000 - timeSinceLastFeed
if (timeSinceLastFeed > 60000) {
if (user.petfood > 0) {
user.petfood -= 1
user[`${pet}exp`] = (user[`${pet}exp`] || 0) + 20
user[`${pet}lastfeed`] = new Date() * 1
m.reply(`🍩 *Memberi makan ${petName}...*\n*${petEmoji} ${petName}: _"${pesan}~"_*`)
if (user[`${pet}exp`] >= user[pet] * 100) {
user[pet] += 1
user[`${pet}exp`] = 0
m.reply(`🍓 *Selamat! ${petName} ${petEmoji} kamu naik ke level ${user[pet]}!*`)
}
} else {
m.reply(`🥺 *Kamu tidak punya cukup petfood!*\n🧁 *Gunakan .buy petfood untuk membeli*`)
}
} else {
m.reply(`⚠️ *${petName} sedang kenyang~*\n⏳ *Coba beri makan lagi dalam:*\n🕒 *${clockString(timeRemaining)}*`)
}
}

handler.help = ['feeding']
handler.tags = ['rpg']
handler.command = /^(feed(ing)?)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

function clockString(ms) {
let m = Math.floor(ms / 60000) % 60
let s = Math.floor(ms / 1000) % 60
return [m + 'm', s + 's'].join(' ')
}

function capitalize(txt) {
return txt.charAt(0).toUpperCase() + txt.slice(1)
}

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}