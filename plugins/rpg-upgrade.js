
const price = {
fishingrod: { wood: 120, string: 140, bank: 150000 },
pickaxe: { wood: 150, iron: 180, bank: 160000 },
sword: { wood: 200, iron: 200, bank: 180000 },
armor: { iron: 220, gold: 80, bank: 200000 },
atm: { emerald: 12, bank: 250000 }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
let { stock } = global.db.data.bots
let user = global.db.data.users[m.sender]
let type = (args[0] || '').toLowerCase()
let total = Math.floor(isNumber(args[1]) ? Math.min(Math.max(parseInt(args[1]), 1), Number.MAX_SAFE_INTEGER) : 1)
let emot = v => global.rpg.emoticon(v)
if (!price[type]) return m.reply(`
🍡 *ITEM KAMU:*${user.fishingrod ? `\n🍩 *Fishingrod (Lv.${user.fishingrod >= 100 ? 'Max' : user.fishingrod})*` : ''}${user.pickaxe ? `\n🍡 *Pickaxe (Lv.${user.pickaxe >= 100 ? 'Max' : user.pickaxe})*` : ''}${user.sword ? `\n🍰 *Sword (Lv.${user.sword >= 100 ? 'Max' : user.sword})*` : ''}${user.armor ? `\n🍬 *Armor (Lv.${user.armor >= 100 ? 'Max' : user.armor})*` : ''}${user.atm ? `\n🍪 *Atm (Lv.${user.atm})*` : ''}
🎯 *Contoh penggunaan: ${usedPrefix + command} pickaxe 1*
`.trim())
if (user[type] === 0) return m.reply(`🍪 *Kamu belum memiliki ${type}*`)
if (user[type] >= 100 && type !== "atm") return m.reply(`🍰 *Level ${type} kamu sudah mencapai batas maksimal!*`)
if (total + user[type] > 100 && type !== "atm") return m.reply(`🍰 *Maksimal level ${type} adalah 100!*`)
let required = Object.keys(price[type]).reduce((acc, key) => {
acc[key] = price[type][key] * total * user[type]
return acc
}, {})
let materials = Object.keys(required)
let lack = materials.filter(mat => user[mat] < required[mat])
if (lack.length) return m.reply(`
🍓 *Kamu kekurangan bahan berikut:*
${lack.map(v => `*✦ ${capitalize(v)}: kurang ${toRupiah(required[v] - user[v])} ${emot(v)}*`).join('\n')}
`.trim())
user[type] += total
for (let mat of materials) {
user[mat] -= required[mat]
stock[mat] += required[mat]
}
if (type !== 'atm') user[`${type}durability`] = user[type] * 50
if (type === 'atm') user.fullatm = user.atm * 1000000000
m.reply(`🍧 *Upgrade berhasil!*\n
🍪 *${capitalize(type)} sekarang Lv.${user[type]} ${emot(type)}*
${type !== 'atm' ? `🍬 *Durability: ${toRupiah(user[`${type}durability`])}*` : `🍬 *Max Saldo: ${toRupiah(user.fullatm)}*`}
${materials.map(v => `*• -${toRupiah(required[v])} ${capitalize(v)} ${emot(v)}*`).join('\n')}
`.trim())
}

handler.help = ['upgrade']
handler.tags = ['rpg']
handler.command = /^(up|upgrade)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

function toRupiah(nominal) {
let num = parseInt(nominal)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}

function isNumber(n) {
let num = parseInt(n)
return typeof num === 'number' && isFinite(num)
}

function capitalize(str) {
return str.charAt(0).toUpperCase() + str.slice(1)
}