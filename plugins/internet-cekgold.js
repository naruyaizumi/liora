let handler = async (m, { conn, args }) => {
let res = await fetch('https://gold-price.vercel.app/api')
if (!res.ok) return conn.reply(m.chat, '❌ *Gagal ambil data harga emas*', m)
let data = await res.json()
let usd = data.usd
let bi = data.kurs_bi
let idr = data.idr
let updateGold = data.update_gold_price
let updateBI = data.update_kurs_bi
let src = data.source
let text = `
*╭─🩵 Harga Emas Hari Ini 🩵*
*│ 💵 USD*
*│ • Oz: ${usd.oz}*
*│ • Gram: ${usd.gr}*
*│ • Kg: ${usd.kg}*
*│*
*│ 🏦 Kurs BI*
*│ • Oz: ${bi.oz}*
*│ • Gram: ${bi.gr}*
*│ • Kg: ${bi.kg}*
*│*
*│ 💰 IDR*
*│ • Oz: ${idr.oz}*
*│ • Gram: ${idr.gr}*
*│ • Kg: ${idr.kg}*
*│*
*│ ⏰ Update Harga: ${updateGold}*
*│ ⏰ Update Kurs: ${updateBI}*
*│ 🔗 Source: ${src}*
*╰───────────────*`
conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['cekgold']
handler.tags = ['internet']
handler.command = /^(cekgold|gold)$/i
handler.limit = true
handler.register = true

export default handler