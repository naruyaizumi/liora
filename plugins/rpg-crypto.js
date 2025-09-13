let handler = async (m, { conn, usedPrefix, command, args }) => {
let bot = global.db.data.bots
let user = global.db.data.users[m.sender]
let name = user.registered ? user.name : await conn.getName(m.sender)
let emot = v => global.rpg.emoticon(v)
let invest = Object.entries(bot.invest.item).sort((a, b) => (b[1].harga * b[1].marketcap) - (a[1].harga * a[1].marketcap))
let cap = `
🍥 *CRYPTO MARKET ${conn.user.name.toUpperCase()}* 🍓
${invest.map((v, i) => {
let hargaLama = v[1].hargaBefore
let hargaBaru = v[1].harga
let perubahan = hargaBaru - hargaLama
let persen = ((hargaBaru - hargaLama) / hargaLama) * 100
return `
────────────────────────
*${i + 1}. ${emot(v[0])} ${v[1].name}*
💴 *Harga Saat Ini:* Rp${toRupiah(hargaBaru)}
📈 *Perubahan:* ${perubahan > 0 ? `*+Rp${toRupiah(perubahan)}*` : `*Rp${toRupiah(perubahan)}`} (${persen.toFixed(2)}%)*
💰 *Market Cap: Rp${toRupiah(hargaBaru * v[1].marketcap)}*`
}).join("\n\n")}
✨ *Contoh penggunaan:*
*• ${usedPrefix}crypto-buy bitcoin 100*
*• ${usedPrefix}crypto-sell bitcoin 100*
*• ${usedPrefix}crypto-history bitcoin*
`.trim()
let commands = command.split("-")[1]
let coinName = (args[0] || '').toLowerCase()
if (!(coinName || commands)) return await conn.sendMessage(m.chat, {
text: cap,
contextInfo: {
externalAdReply: {
title: "Crypto Market",
body: `📈 Akses pasar crypto di ${conn.user.name}`,
mediaType: 1,
thumbnailUrl: "https://files.catbox.moe/l0c3c2.jpg",
renderLargerThumbnail: true
}
}
}, { quoted: m })
let coin = Object.entries(bot.invest.item).find(v => v[1].name.toLowerCase() === coinName)
if (!coin) return m.reply(`🚫 *Aset crypto tidak ditemukan.*\n\n📋 *Daftar aset yang tersedia:*\n${invest.map(v => `*• ${v[1].name}*`).join("\n")}`)
user.invest[coinName] = user.invest[coinName] || { harga: 0, stock: 0 }
let total = Math.floor(isNumber(args[1]) ? Math.min(Math.max(parseInt(args[1]), 1), 1_000_000) : 1)
switch (commands) {
case 'buy': {
let price = coin[1].harga * total
if (price > user.bank) return m.reply("💸 *Saldo bank tidak mencukupi untuk melakukan pembelian.*")
let avg = await calculateAverage(user.invest[coinName].harga, user.invest[coinName].stock, coin[1].harga, total)
user.bank -= price
user.invest[coinName].stock += total
user.invest[coinName].harga = avg
coin[1].marketcap += total
coin[1].volumeBuy += total
coin[1].trade.push({ user: m.sender, total, type: "buy" })
m.reply(`🟢 *Transaksi Pembelian Berhasil*\n*Aset: ${coin[1].name}*\n*Jumlah: ${toRupiah(total)} unit*\n*Harga per unit: Rp${toRupiah(coin[1].harga)}*\n*Total: Rp${toRupiah(price)}*`)
break
}
case 'sell': {
if (user.invest[coinName].stock < total) return m.reply(`🍃 *Jumlah ${coinName} yang kamu miliki tidak mencukupi untuk dijual.*`)
let price = coin[1].harga * total
if (user.fullatm < user.bank + price) return m.reply(`🏦 *Saldo bank penuh. Silakan upgrade kapasitas penyimpanan.*`)
let avg = await calculateAverage(user.invest[coinName].harga, user.invest[coinName].stock, coin[1].harga, total)
user.bank += price
user.invest[coinName].stock -= total
user.invest[coinName].harga = avg
coin[1].marketcap -= total
coin[1].volumeSell += total
coin[1].trade.push({ user: m.sender, total, type: "sell" })
m.reply(`🔴 *Transaksi Penjualan Berhasil*\n*Aset: ${coin[1].name}*\n*Jumlah: ${toRupiah(total)} unit*\n*Harga jual: Rp${toRupiah(coin[1].harga)}*\n*Dana diterima: Rp${toRupiah(price)}*`)
break
}
case 'history': {
let txt = `📘 *Riwayat Transaksi ${coin[1].name}*\n\n` +
coin[1].trade.slice().reverse().slice(0, 20).map(v => {
return `*• (${conn.getName(v.user).slice(0, 5)}..)* *${v.type === 'buy' ? 'BUY' : 'SELL'}* *${toRupiah(v.total)} ${coin[1].name}*`
}).join('\n')
m.reply(txt)
break
}
default:
return m.reply(`❗ *Perintah tidak valid.*\n\n💡 Gunakan:\n${usedPrefix}crypto-buy nama jumlah`)
}
}

handler.help = ['crypto', 'crypto-buy', 'crypto-sell', 'crypto-history']
handler.tags = ['rpg']
handler.command = /^((invest|crypto)(-buy|-sell|-history)?)$/i
handler.rpg = true
handler.group = true
export default handler

async function calculateAverage(hargaNew, stockNew, harga, stock) {
let total = (hargaNew * stockNew) + (harga * stock)
let quantity = stockNew + stock
return Math.floor(total / quantity)
}

function isNumber(x) {
return !isNaN(x) && typeof +x === 'number'
}

const toRupiah = number => {
return parseInt(number).toLocaleString('id-ID').replace(/\./g, ",")
}