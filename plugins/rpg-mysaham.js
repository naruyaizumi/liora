let handler = async (m, { conn }) => {
let bot = global.db.data.bots
let user = global.db.data.users[m.sender]
let name = user.registered ? user.name : await conn.getName(m.sender)
let invest = Object.entries(user.saham).filter(v => v[1].stock != 0)
const hargaSebelumnyas = await Hitung(invest)
const hargaSekarangs = await HitungProfit(invest, bot)
const keuntungans = ((hargaSekarangs - hargaSebelumnyas) / hargaSebelumnyas) * 100
let cap = invest.length > 0 ? `
🌸 *RINGKASAN PORTOFOLIO SAHAM - ${conn.user.name.toUpperCase()}* 🍓
🎀 *Investor: ${name}*
────────────────────────
💼 *Total Investasi Awal: Rp${toRupiah(hargaSebelumnyas)}*
💹 *Nilai Portofolio Saat Ini: Rp${toRupiah(hargaSekarangs)}*
📈 *Akumulasi Profit/Loss: ${hargaSekarangs - hargaSebelumnyas >= 0 ? '+' : ''}Rp${toRupiah(hargaSekarangs - hargaSebelumnyas)} (${keuntungans.toFixed(2)}%)*
${invest.map((v, i) => {
let saham = v[0]
let data = v[1]
let hargaSekarang = bot.saham.item[saham].harga
let profit = hargaSekarang - data.harga
let totalProfit = profit * data.stock
let persen = ((hargaSekarang - data.harga) / data.harga) * 100
return `
────────────────────────
*${i + 1}. ${capitalize(saham)}* 🍡
💴 *Harga Beli: Rp${toRupiah(data.harga)}*
💸 *Harga Saat Ini: Rp${toRupiah(hargaSekarang)}*
📦 *Jumlah Saham: ${data.stock} lembar (${toRupiah(data.stock / 100)} lot)*
💰 *Nilai Beli: Rp${toRupiah(data.harga * data.stock)}*
💼 *Nilai Saat Ini: Rp${toRupiah(hargaSekarang * data.stock)}*
📊 *Unrealized P/L: ${totalProfit >= 0 ? '+' : ''}Rp${toRupiah(totalProfit)} (${persen.toFixed(2)}%)*`
}).join("\n\n")}
`.trim() : "💔 *Kamu belum memiliki saham apapun. Yuk mulai invest dan bangun portofoliomu, sayang~*"
await conn.sendMessage(m.chat, {
text: cap,
contextInfo: {
externalAdReply: {
title: "Saham & Portofolio Kamu",
body: "Cek performa investasimu secara real-time!",
mediaType: 1,
thumbnailUrl: "https://files.catbox.moe/l0c3c2.jpg",
renderLargerThumbnail: true
}
}
}, { quoted: m })
}

handler.help = ["mysaham"]
handler.tags = ["rpg"]
handler.command = /^(mysaham)$/i
handler.register = true
handler.rpg = true
handler.group = true

export default handler

const toRupiah = n => parseInt(n).toLocaleString('id-ID').replace(/\./g, ",")

async function Hitung(invest) {
let result = 0
for (let v of invest) result += v[1].stock * v[1].harga
return result
}

async function HitungProfit(invest, bot) {
let result = 0
for (let v of invest) result += v[1].stock * bot.saham.item[v[0]].harga
return result
}

function capitalize(word) {
return word.charAt(0).toUpperCase() + word.slice(1)
}