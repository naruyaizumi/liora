
let handler = async (m, { conn, args }) => {
let user = global.db.data.users[m.sender]

const items = {
kepiting: { price: 9500, emoji: '🦀', type: 'laut' },
lobster: { price: 15000, emoji: '🦞', type: 'laut' },
udang: { price: 9000, emoji: '🦐', type: 'laut' },
cumi: { price: 8500, emoji: '🦑', type: 'laut' },
gurita: { price: 10000, emoji: '🐙', type: 'laut' },
buntal: { price: 6500, emoji: '🐡', type: 'laut' },
dory: { price: 7000, emoji: '🐠', type: 'laut' },
orca: { price: 12000, emoji: '🐳', type: 'laut' },
lumba: { price: 10000, emoji: '🐬', type: 'laut' },
paus: { price: 14000, emoji: '🐋', type: 'laut' },
ikan: { price: 6000, emoji: '🐟', type: 'laut' },
hiu: { price: 13000, emoji: '🦈', type: 'laut' },
banteng: { price: 11000, emoji: '🐃', type: 'darat' },
harimau: { price: 13000, emoji: '🐅', type: 'darat' },
gajah: { price: 12000, emoji: '🐘', type: 'darat' },
kambing: { price: 10000, emoji: '🐐', type: 'darat' },
panda: { price: 15000, emoji: '🐼', type: 'darat' },
buaya: { price: 10000, emoji: '🐊', type: 'darat' },
kerbau: { price: 9000, emoji: '🐃', type: 'darat' },
sapi: { price: 9500, emoji: '🐄', type: 'darat' },
monyet: { price: 5000, emoji: '🐒', type: 'darat' },
babihutan: { price: 8000, emoji: '🐗', type: 'darat' },
babi: { price: 8500, emoji: '🐖', type: 'darat' },
ayam: { price: 7000, emoji: '🐔', type: 'darat' },
botol: { price: 300, emoji: '🧴', type: 'sampah' },
kardus: { price: 500, emoji: '📦', type: 'sampah' },
kaleng: { price: 300, emoji: '🥫', type: 'sampah' },
gelas: { price: 100, emoji: '🥛', type: 'sampah' },
plastik: { price: 200, emoji: '🛍️', type: 'sampah' }
}

if (!args[0]) {
let teks = '🍰 *Daftar Harga Item*\n\n'
for (let [key, val] of Object.entries(items)) {
teks += `*${val.emoji} ${key} : ${toRupiah(val.price)}*\n`
}
teks += '\n\n🫧 *Cara jual: .jual [key] [jumlah|all]*\n'
teks += '🍱 *Kategori Penjualan:*\n'
teks += '🐄 *Kandang: Hewan darat*\n*› .jual kandang*\n'
teks += '🐟 *Kolam: Hewan laut*\n*› .jual kolam*\n'
teks += '♻️ *Sampah: Barang daur ulang*\n*› .jual sampah*\n'
return m.reply(teks.trim())
}
let item = args[0].toLowerCase()
let total = 0
let sold = []
if (item === 'kandang' || item === 'kolam' || item === 'sampah') {
let kategori = item === 'kandang' ? 'darat' : item === 'kolam' ? 'laut' : 'sampah'
for (let [key, val] of Object.entries(items)) {
if (val.type === kategori && user[key]) {
let count = user[key]
let profit = count * val.price
user[key] = 0
user.money += profit
total += profit
sold.push(`${val.emoji} ${key} x${count}`)
}
}
if (total === 0) return m.reply(`🍮 *Kamu tidak punya item di kategori ini!*`)
return m.reply(`🍭 *Berhasil menjual semua ${item}*\n${sold.map(v => '* ' + v).join('*\n')}\n🍬 *Total: ${toRupiah(total)}*`)
}
if (!(item in items)) return m.reply(`🍩 *Item tidak ditemukan!*`)
let count = args[1]?.toLowerCase() === 'all' ? user[item] : Math.min(Math.max(parseInt(args[1]) || 1, 1), Number.MAX_SAFE_INTEGER)
if (!user[item] || user[item] < count) return m.reply(`🧁 *${items[item].emoji} ${item} kamu tidak cukup!*`)
user[item] -= count
total = items[item].price * count
user.money += total
m.reply(`🍭 *Berhasil menjual ${items[item].emoji} ${item} x${count}*\n🍬 *Total: ${toRupiah(total)}*`)
}

handler.help = ['jual', 'pasar']
handler.tags = ['rpg']
handler.command = /^(jual|pasar)$/i
handler.register = true

export default handler

function toRupiah(nominal) {
let num = parseInt(nominal)
return 'Rp' + Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}