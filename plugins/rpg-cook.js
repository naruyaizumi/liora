
let handler = async (m, { conn, usedPrefix, command, text }) => {
let data = Object.keys(resep)
let listResep = data.map((v) => {
return `🍱 *${capitalize(v)} ${emot(v)}*\n🍥 *Bahan:*\n${resep[v].map(x => `*• ${capitalize(x)} ${emot(x)}*`).join("\n")}`
}).join("\n\n")
let example = `\n\n🍳 *Contoh:*\n${usedPrefix + command} steak`
let user = global.db.data.users[m.sender]
let type = (text || '').toLowerCase()
if (!type) return m.reply(`✨ *Kamu ingin masak apa hari ini, chef?*\n\n${listResep + example}`)
if (!data.includes(type)) return m.reply(`😵‍💫 *Maaf, resep ${type} nggak ditemukan yaa~*\n\n${listResep + example}`)
let required = resep[type]
let bahan = required.filter(x => !user[x] || user[x] < 1)
if (bahan.length) return m.reply(`🧺 *Kamu butuh bahan berikut dulu yaa, sayang:*\n${bahan.map(x => `• ${capitalize(x)} ${emot(x)}`).join("\n")}`)
await m.reply("👩‍🍳 *Lagi masak yaa... tunggu bentar yaa~*")
await delay(5000)
await m.reply(`🎉 *Yatta~ ${capitalize(type)} ${emot(type)} sudah siap disajikan!* 🍽️`)
required.forEach(x => user[x]--)
user[type]++
}

handler.help = ["cook"]
handler.tags = ["rpg"]
handler.command = /^(masak|cook)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

let delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

let resep = {
"steak": ['sapi', 'garam'],
"ayam_goreng": ['ayam', 'garam', 'minyak'],
"ribs": ['babi', 'garam'],
"roti": ['gandum'],
"udang_goreng": ['udang', 'minyak', 'garam'],
"bacon": ['babi'],
}

let emot = (item) => {
item = item.toLowerCase()
return {
"sapi": "🐄",
"ayam": "🐔",
"babi": "🐷",
"udang": "🦐",
"gandum": "🌾",
"garam": "🧂",
"minyak": "🛢️",
"steak": "🥩",
"ayam_goreng": "🍗",
"ribs": "🍖",
"roti": "🍞",
"udang_goreng": "🍤",
"bacon": "🥓"
}[item] || "🍽️"
}

function capitalize(word) {
return word.charAt(0).toUpperCase() + word.slice(1)
}

function isNumber(number) {
number = parseInt(number)
return typeof number == 'number' && isFinite(number)
}