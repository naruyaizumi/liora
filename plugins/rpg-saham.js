let handler = async (m, { conn, usedPrefix, command, args }) => {
let bot = global.db.data.bots
let user = global.db.data.users[m.sender]
let name = user.registered ? user.name : await conn.getName(m.sender)
let invest = Object.entries(bot.saham.item).sort((a, b) => {
let totalA = a[1].marketcap * a[1].harga
let totalB = b[1].marketcap * b[1].harga
return totalB - totalA
})
let cap = `
*📈 BURSA SAHAM ${conn.user.name.toUpperCase()}* 🏛️
${invest.map((v, i) => {
let hargaSebelumnya = v[1].hargaBefore
let hargaSekarang = v[1].harga
let keuntungan = ((hargaSekarang - hargaSebelumnya) / hargaSebelumnya) * 100
let update = hargaSekarang - hargaSebelumnya
return `────────────────────────
*${i + 1}. ${v[1].name}*
📌 *Harga per lembar: Rp${toRupiah(hargaSekarang)}*
💼 *Harga per lot: Rp${toRupiah(hargaSekarang * 100)}*
📊 *Perubahan: ${update > 0 ? `+Rp${toRupiah(update)}` : `Rp${toRupiah(update)}`} (${keuntungan.toFixed(2)}%)*
💰 *Market Cap: Rp${toRupiah(v[1].marketcap * hargaSekarang)}*`
}).join("\n")}
\n✨ *Contoh Penggunaan:*
🍓 *${usedPrefix}saham-buy bbca 100*
🍓 *${usedPrefix}saham-sell bbca 100*
🍓 *${usedPrefix}saham-history bbca*
`.trim()
let commands = command.split("-")[1]
let text = (args[0] || "").toLowerCase()
let sahamName = (text || '').toUpperCase()
if (!(sahamName || commands)) return await conn.sendMessage(m.chat, {
text: cap,
contextInfo: {
externalAdReply: {
title: "Stock Market",
body: `📊 Saham di ${conn.user.name}`,
mediaType: 1,
thumbnailUrl: "https://files.catbox.moe/l0c3c2.jpg",
renderLargerThumbnail: true
}
}
}, { quoted: m })
let saham = Object.entries(bot.saham.item).find(v => v[1].name.toLowerCase() == text)
if (!saham) return m.reply(`🍥 *Nama saham tidak ditemukan!*\n\n📒 *List saham:*\n${invest.map(v => `*• ${v[1].name}* 🍡`).join("\n")}`)
user.saham[sahamName] = user.saham[sahamName] || { harga: 0, stock: 0 }
let total = (Math.floor(isNumber(args[1]) ? Math.min(Math.max(parseInt(args[1]), 1), Number.MAX_SAFE_INTEGER) : 1) * 1) * 100
switch (commands) {
case 'buy': {
let price = saham[1].harga * total
if (price > user.bank) return m.reply("💸 *Saldo bank kamu tidak mencukupi untuk membeli saham ini.*")
let avarage = await calculateAverage(user.saham[sahamName].harga, user.saham[sahamName].stock, saham[1].harga, total)
user.bank -= price
user.saham[sahamName].stock += total
user.saham[sahamName].harga = avarage
bot.saham.item[sahamName].marketcap += total
bot.saham.item[sahamName].volumeBuy += total
bot.saham.item[sahamName].trade.push({ user: m.sender, total, type: "buy" })
m.reply(`🧃 *Transaksi berhasil.*\n*Kamu membeli ${toRupiah(total / 100)} lot saham ${sahamName} pada harga Rp${toRupiah(saham[1].harga)} per lembar.*\n*Total nilai transaksi: Rp${toRupiah(price)}.*`)
break
}
case 'sell': {
if (user.saham[sahamName].stock < total) return m.reply(`🍡 *Jumlah saham tidak mencukupi.*\n*Kamu hanya memiliki ${toRupiah(user.saham[sahamName].stock / 100)} lot ${sahamName}.*`)
let price = saham[1].harga * total
if (user.fullatm < user.bank + price) return m.reply(`👛 *Kapasitas bank penuh. Upgrade diperlukan untuk menyimpan hasil penjualan.*`)
let avarage = await calculateAverage(user.saham[sahamName].harga, user.saham[sahamName].stock, saham[1].harga, total)
user.bank += price
user.saham[sahamName].stock -= total
user.saham[sahamName].harga = avarage
bot.saham.item[sahamName].marketcap -= total
bot.saham.item[sahamName].volumeSell += total
bot.saham.item[sahamName].trade.push({ user: m.sender, total, type: "sell" })
m.reply(`🍰 *Penjualan berhasil.*\n*Kamu menjual ${toRupiah(total / 100)} lot saham ${sahamName} pada harga Rp${toRupiah(saham[1].harga)} per lembar.*\n*Dana diterima: Rp${toRupiah(price)}.*`)
break
}
case 'history': {
let footer = `📘 *Riwayat Transaksi ${bot.saham.item[sahamName].name}* 🍮\n\n`
let cap = bot.saham.item[sahamName].trade.slice().reverse().slice(0, 19).map(v => {
return `*• (${conn.getName(v.user).slice(0, 5)}..)* *${v.type == "buy" ? "Membeli" : "Menjual"}* *${toRupiah(v.total)} 🧁 ${bot.saham.item[sahamName].name}*`
}).join("\n")
m.reply(footer + cap)
break
}
default:
}
}

handler.help = ["saham", "saham-buy", "saham-sell", "saham-history"]
handler.tags = ["rpg"]
handler.command = /^(saham(-buy|-sell|-history)?)$/i
handler.register = true
handler.rpg = true
handler.group = true

export default handler

async function calculateAverage(hargaNew, stockNew, harga, stock) {
let stockHarga = new Array(stock).fill(harga)
for (let i = 0; i < stockNew; i++) stockHarga.push(hargaNew)
let totalBiaya = stockHarga.reduce((total, harga) => total + harga, 0)
let jumlahTransaksi = stockHarga.length
let biayaRataRata = totalBiaya / jumlahTransaksi
return Math.floor(biayaRataRata)
}

function isNumber(number) {
number = parseInt(number)
return typeof number == 'number' && !isNaN(number)
}

const toRupiah = number => {
let num = parseInt(number)
return Math.min(num, Number.MAX_SAFE_INTEGER).toLocaleString('id-ID').replace(/\./g, ",")
}