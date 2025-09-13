let handler = async (m, { conn }) => {
let bot = global.db.data.bots
let user = global.db.data.users[m.sender]
let name = user.registered ? user.name : await conn.getName(m.sender)
let invest = Object.entries(user.invest).filter(v => v[1].stock != 0)
if (!invest.length) return m.reply("💔 *Kamu belum memiliki aset crypto. Yuk mulai investasi dari sekarang, sayang~*")
const hargaSebelumnyas = await Hitung(invest)
const hargaSekarangs = await HitungProfit(invest, bot)
const keuntungans = ((hargaSekarangs - hargaSebelumnyas) / hargaSebelumnyas) * 100
let cap = `
🌸 *DOMPET CRYPTO – ${conn.user.name.toUpperCase()}* 🍓
🎀 *Investor: ${name}*
────────────────────────
💼 *Total Modal Awal: Rp${toRupiah(hargaSebelumnyas)}*
💰 *Nilai Portofolio Saat Ini: Rp${toRupiah(hargaSekarangs)}*
📈 *Akumulasi P/L: ${hargaSekarangs - hargaSebelumnyas >= 0 ? '+' : ''}Rp${toRupiah(hargaSekarangs - hargaSebelumnyas)} (${keuntungans.toFixed(2)}%)*
${invest.map((v, i) => {
let koin = v[0]
let data = v[1]
let hargaSekarang = bot.invest.item[koin].harga
let profit = hargaSekarang - data.harga
let totalProfit = profit * data.stock
let persen = ((hargaSekarang - data.harga) / data.harga) * 100
return `
────────────────────────
*${i + 1}. ${capitalize(koin)}* 🧁
💴 *Harga Beli: Rp${toRupiah(data.harga)}*
💹 *Harga Saat Ini: Rp${toRupiah(hargaSekarang)}*
🪙 *Kepemilikan: ${toRupiah(data.stock)} unit*
💸 *Nilai Awal: Rp${toRupiah(data.stock * data.harga)}*
💼 *Nilai Sekarang: Rp${toRupiah(data.stock * hargaSekarang)}*
📊 *Profit: ${totalProfit >= 0 ? '+' : ''}Rp${toRupiah(totalProfit)} (${persen.toFixed(2)}%)*`
}).join("\n\n")}
`.trim()
await conn.sendMessage(m.chat, {
text: cap,
contextInfo: {
externalAdReply: {
title: "Dompet Crypto Kamu",
body: "Pantau kinerja aset digitalmu dengan mudah dan interaktif.",
mediaType: 1,
thumbnailUrl: "https://files.catbox.moe/l0c3c2.jpg",
renderLargerThumbnail: true
}
}
}, { quoted: m })
}

handler.help = ["mycoin"]
handler.tags = ["rpg"]
handler.command = /^(mycoin|mycrypto)$/i
handler.rpg = true
handler.register = true

export default handler

const toRupiah = n => parseInt(n).toLocaleString('id-ID').replace(/\./g, ",")

async function Hitung(invest) {
let result = 0
for (let v of invest) result += v[1].stock * v[1].harga
return result
}

async function HitungProfit(invest, bot) {
let result = 0
for (let v of invest) result += v[1].stock * bot.invest.item[v[0]].harga
return result
}

function capitalize(word) {
return word.charAt(0).toUpperCase() + word.slice(1)
}