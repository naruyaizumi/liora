import daily from './rpg-daily.js'
import weekly from './rpg-weekly.js'
import monthly from './rpg-monthly.js'
import adventure from './rpg-adventure.js'

let inventory = {
items: {
bibitanggur: '🍇 bibitanggur',
bibitmangga: '🥭 bibitmangga',
bibitpisang: '🍌 bibitpisang',
bibitapel: '🍎 bibitapel',
bibitjeruk: '🍊 bibitjeruk',
anggur: '🍇 anggur',
mangga: '🥭 mangga',
pisang: '🍌 pisang',
apel: '🍎 apel',
jeruk: '🍊 jeruk',
potion: '🧪 potion',
trash: '🗑️ trash',
wood: '🪵 wood',
rock: '🪨 rock',
string: '🧵 string',
emerald: '💚 emerald',
diamond: '💎 diamond',
gold: '🪙 gold',
iron: '⚙️ iron',
umpan: '🪱 umpan',
upgrader: '⚡ upgrader',
pet: '🐾 pet',
petfood: '🍖 petfood',
steak: '🥩 steak',
ayam_goreng: '🍗 ayam_goreng',
ribs: '🍖 ribs',
roti: '🍞 roti',
udang_goreng: '🍤 udang_goreng',
bacon: '🥓 bacon',
gandum: '🌾 gandum',
minyak: '🧴 minyak',
garam: '🧂 garam'
},
crates: {
common: '📦 common',
uncommon: '🧃 uncommon',
mythic: '💜 mythic',
legendary: '🌟 legendary'
},
pets: {
horse: '🐴 horse',
cat: '🐱 cat',
fox: '🦊 fox',
dog: '🐶 dog',
robo: '🤖 robo'
},
tools: {
armor: {
'0': '❌',
'1': 'Leather Armor',
'2': 'Iron Armor',
'3': 'Gold Armor',
'4': 'Diamond Armor',
'5': 'Emerald Armor',
'6': 'Crystal Armor',
'7': 'Obsidian Armor',
'8': 'Netherite Armor',
'9': 'Wither Armor',
'10': 'Dragon Armor',
'11': 'Hacker Armor'
},
sword: {
'0': '❌',
'1': 'Wooden Sword',
'2': 'Stone Sword',
'3': 'Iron Sword',
'4': 'Gold Sword',
'5': 'Copper Sword',
'6': 'Diamond Sword',
'7': 'Emerald Sword',
'8': 'Obsidian Sword',
'9': 'Netherite Sword',
'10': 'Samurai Slayer Green Sword',
'11': 'Hacker Sword'
},
pickaxe: {
'0': '❌',
'1': 'Wooden Pickaxe',
'2': 'Stone Pickaxe',
'3': 'Iron Pickaxe',
'4': 'Gold Pickaxe',
'5': 'Copper Pickaxe',
'6': 'Diamond Pickaxe',
'7': 'Emerlad Pickaxe',
'8': 'Crystal Pickaxe',
'9': 'Obsidian Pickaxe',
'10': 'Netherite Pickaxe',
'11': 'Hacker Pickaxe'
},
fishingrod: {
'0': '❌',
'1': 'Wooden Fishingrod',
'2': 'Stone Fishingrod',
'3': 'Iron Fishingrod',
'4': 'Gold Fishingrod',
'5': 'Copper Fishingrod',
'6': 'Diamond Fishingrod',
'7': 'Emerald Fishingrod',
'8': 'Crystal Fishingrod',
'9': 'Obsidian Fishingrod',
'10': 'God Fishingrod',
'11': 'Hacker Fishingrod'
}
}
}

let handler = async (m, { conn }) => {
let who = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
let user = global.db.data.users[who]
if (!user) return m.reply('💔 *User tidak ditemukan dalam database.*')
let name = user.name || await conn.getName(who)
let limit = new Date() - user.premiumTime < 0 ? 'Unlimited' : toRupiah(user.limit)
let items = Object.entries(inventory.items)
.map(([key, label]) => user[key] ? `*➠ ${label}: ${toRupiah(user[key])}*` : '')
.filter(Boolean).join('\n')
let crates = Object.entries(inventory.crates)
.map(([key, label]) => user[key] ? `*➠ ${label}: ${toRupiah(user[key])}*` : '')
.filter(Boolean).join('\n')
let pets = Object.entries(inventory.pets)
.map(([key, label]) => user[key] ? `*➠ ${label}: ${user[key] >= inventory.pets[key] ? 'Max Level' : 'Level ' + toRupiah(user[key])}*` : '')
.filter(Boolean).join('\n')
let tools = Object.keys(inventory.tools)
.map(tool => {
let level = user[tool]
if (!level || typeof inventory.tools[tool] !== 'object') return ''
return `*➠ ${tool}: ${inventory.tools[tool][level.toString()] || '❌'}*`
}).filter(Boolean).join('\n')
let caption = `
🌸 *I N V E N T O R Y   K A M U* 🌸
────────────────────────────
🧚‍♀️ *Nama: ${name}*
🎀 *Level: ${toRupiah(user.level)}*
🩷 *Limit: ${limit}*
────────────────────────────
${tools ? `
🛠️ *Peralatan:*
${tools}` : ''}

${items ? `
🎒 *Barang:*
${items}` : ''}

${crates ? `
🎁 *Crates:*
${crates}` : ''}

${pets ? `
🐶 *Pets:*
${pets}` : ''}
`.trim()
await conn.sendMessage(m.chat, {
text: caption
}, { quoted: m })
}

handler.help = ['inventory']
handler.tags = ['rpg']
handler.command = /^(inv(entory)?|bal(ance)?|money|e?xp)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

function toRupiah(nominal) {
return parseInt(nominal).toLocaleString().replace(/,/g, ',')
}