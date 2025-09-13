let items = {
buy: {
limit: { exp: 10000 },
exp: { money: 1000 },
chip: { money: 1000000 },
potion: { money: 1250 },
trash: { money: 40 },
wood: { money: 700 },
rock: { money: 850 },
string: { money: 400 },
iron: { money: 3000 },
diamond: { money: 500000 },
emerald: { money: 100000 },
gold: { money: 100000 },
common: { money: 10000 },
uncommon: { money: 20000 },
mythic: { money: 75000 },
legendary: { money: 200000 },
petfood: { money: 3500 },
pet: { money: 120000 },
anggur: { money: 2000 },
apel: { money: 2000 },
jeruk: { money: 2000 },
mangga: { money: 2000 },
pisang: { money: 2000 },
bibitanggur: { money: 2000 },
bibitapel: { money: 2000 },
bibitjeruk: { money: 2000 },
bibitmangga: { money: 2000 },
bibitpisang: { money: 2000 },
umpan: { money: 5000 },
garam: { money: 1000 },
minyak: { money: 1000 },
gandum: { money: 1500 },
steak: { money: 10000 },
ayam_goreng: { money: 10000 },
ribs: { money: 8000 },
roti: { money: 5000 },
udang_goreng: { money: 10000 },
bacon: { money: 5000 }
},
sell: {
limit: { exp: 1000 },
exp: { money: 2 },
chip: { money: 900000 },
potion: { money: 625 },
trash: { money: 20 },
wood: { money: 350 },
rock: { money: 425 },
string: { money: 200 },
iron: { money: 1500 },
diamond: { money: 250000 },
emerald: { money: 50000 },
gold: { money: 50000 },
common: { money: 5000 },
uncommon: { money: 10000 },
mythic: { money: 37500 },
legendary: { money: 100000 },
petfood: { money: 1750 },
pet: { money: 60000 },
anggur: { money: 1000 },
apel: { money: 1000 },
jeruk: { money: 1000 },
mangga: { money: 1000 },
pisang: { money: 1000 },
bibitanggur: { money: 1000 },
bibitapel: { money: 1000 },
bibitjeruk: { money: 1000 },
bibitmangga: { money: 1000 },
bibitpisang: { money: 1000 },
umpan: { money: 2500 },
garam: { money: 500 },
minyak: { money: 500 },
gandum: { money: 750 },
steak: { money: 5000 },
ayam_goreng: { money: 5000 },
ribs: { money: 4000 },
roti: { money: 2500 },
udang_goreng: { money: 5000 },
bacon: { money: 2500 }
}
}

let handler = async (m, { conn, command, args, usedPrefix }) => {
let user = global.db.data.users[m.sender]
let stock = global.db.data.bots.stock
let emot = v => global.rpg.emoticon(v)
let text = args.join(" ").toLowerCase()
let useBank = text.includes("bank")
let itemsList = text.replace(/bank/g, "").split(",").map(v => v.trim())
let daftar = items[command]
if (!text || itemsList.length === 0 || !/\w+/.test(itemsList[0])) {
let diskonBank = user.atm >= 1 ? Math.min(user.atm, 40) : 0
let diskonDog = Math.min(user.dog || 0, 30)
let daftarItems = Object.entries(daftar).map(([key, val]) => {
let metode = useBank && !/exp|limit/.test(key) && val.bank ? "bank" : Object.keys(val)[0]
let harga = val[metode]
let totalDiskon = command == 'buy' ? (diskonBank + diskonDog) : 0
let diskon = harga * totalDiskon / 100
let final = Math.max(harga - diskon, 0)
let emoticon = emot(key)
let coret = (command == 'buy' && diskon > 0)
? `~${toRupiah(harga)}~ ${toRupiah(final)}`
: `${toRupiah(harga)}`
return `*${emoticon} ${key} : ${coret}*`
}).join('\n')
return conn.sendMessage(m.chat, {
text: `*───『 ${command.toUpperCase()} MENU 』───*

🎁 *Diskon Aktif:*
${diskonBank ? `🏦 *Bank: ${diskonBank}%*` : ''}
${diskonDog ? `🐶 *Doggy: ${diskonDog}%*` : ''}

${daftarItems}

💡 *Contoh:*
*• ${usedPrefix + command} potion 3, steak 2*
*• ${usedPrefix + command} potion 3, steak 2 bank*`
}, { quoted: m })
}
if (useBank && user.atm < 1) return m.reply("🔒 *Minimal level ATM 1 untuk menggunakan pembayaran via bank.*")
let hasil = []
let gagal = []
let totalHargaAll = 0
let diskonATM = useBank ? Math.min(user.atm, 40) : 0
let metodeBayarList = {}
for (let itemEntry of itemsList) {
let [nama, jumlah] = itemEntry.split(/\s+/)
let item = nama?.toLowerCase()
let total = Math.max(1, Math.min(parseInt(jumlah) || 1, Number.MAX_SAFE_INTEGER))
if (!item || !daftar[item]) {
gagal.push(`*${item} ❌ tidak ditemukan*`)
continue
}
let metode = useBank && !/exp|limit/.test(item) && daftar[item].bank ? "bank" : Object.keys(daftar[item])[0]
if (!(metode in user)) {
gagal.push(`*${item} ❌ tidak bisa pakai ${metode}*`)
continue
}
let hargaDasar = daftar[item][metode]
if (typeof hargaDasar !== 'number' || isNaN(hargaDasar)) {
gagal.push(`*${item} ❌ harga tidak valid*`)
continue
}
let diskonBank = command == "buy" && useBank ? (hargaDasar * Math.min(user.atm, 40) / 100) : 0
let diskonDog = command == "buy" && user.dog ? (hargaDasar * Math.min(user.dog, 30) / 100) : 0
let hargaSatuan = command == "buy" ? Math.max(hargaDasar - diskonBank - diskonDog, 0) : hargaDasar
let hargaTotal = hargaSatuan * total
if (isNaN(hargaTotal)) {
gagal.push(`*${item} ❌ gagal menghitung harga*`)
continue
}
if (command == "buy") {
if (!/exp|limit/.test(item)) {
if (stock[item] === 0) {
gagal.push(`*${item} 📦 stok habis*`)
continue
}
if (stock[item] < total) {
gagal.push(`*${item} stok hanya ${stock[item]}*`)
continue
}
}
if (user[metode] < hargaTotal) {
gagal.push(`*${item} 💸 kurang dana: butuh ${toRupiah(hargaTotal)} ${metode}*`)
continue
}
user[metode] -= hargaTotal
user[item] = (user[item] || 0) + total
if (!/exp|limit/.test(item)) stock[item] -= total
hasil.push(`*${emot(item)} ${item} x${total}*`)
totalHargaAll += hargaTotal
if (!metodeBayarList[metode]) metodeBayarList[metode] = 0
metodeBayarList[metode] += hargaTotal
} else {
if ((user[item] || 0) < total) {
gagal.push(`*${item} kamu hanya punya ${user[item] || 0}*`)
continue
}
let hasilJual = hargaTotal
if (metode == "money") {
let maxMoney = user.cat ? 99999999 + user.cat * 4000000 : 99999999
if (user.money + hasilJual > maxMoney) {
gagal.push(`*${item} uangmu akan melebihi limit*`)
continue
}
}
user[item] -= total
user[metode] += hasilJual
stock[item] += total
hasil.push(`${emot(item)} ${item} x${total}`)
totalHargaAll += hasilJual
if (!metodeBayarList[metode]) metodeBayarList[metode] = 0
metodeBayarList[metode] += hasilJual
}
}
let pesan = `*───『 ${command.toUpperCase()} 』───*\n`
if (hasil.length) {
pesan += `🍱 *Berhasil:*\n${hasil.join('\n')}\n`
for (let metode in metodeBayarList) {
let icon = metode == 'exp' ? '⚡' : metode == 'bank' ? '🏦' : '💰'
pesan += `${icon} *Total: ${toRupiah(metodeBayarList[metode])} ${metode.toUpperCase()}*\n`
}
if (useBank) pesan += `🏦 *Metode: BANK (diskon ${diskonATM}%)*\n`
if (user.dog && command == 'buy') pesan += `🐶 *Doggy bonus: ${Math.min(user.dog, 30)}%*\n`
}
if (gagal.length) pesan += `\n❌ *Gagal:*\n${gagal.join('\n')}`
if (!hasil.length && !gagal.length) pesan += `*Tidak ada item valid yang diproses.*`
m.reply(pesan.trim())
}

handler.help = ['buy', 'sell']
handler.tags = ['rpg']
handler.command = /^(buy|sell)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

function toRupiah(x) {
return 'Rp ' + parseInt(x).toLocaleString().replace(/,/g, ",")
}